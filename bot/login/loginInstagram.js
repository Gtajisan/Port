/**
 * loginInstagram.js — Instagram adapter for Baka-Chan Bot
 *
 * Drop-in replacement for bot/login/login.js when INSTAGRAM_MODE=true.
 * Creates an FCA-interface-compatible api via instagram/adapter.js,
 * then runs the identical post-login flow (loadData → custom → loadScripts
 * → callBackListen → uptime → restartListenMqtt → autoUptime).
 *
 * Zero changes to commands, events, handlers, or database code required.
 */

"use strict";

require("dotenv").config();

// ─── set terminal title ───────────────────────────────────────────────────────
process.stdout.write("\x1b]2;Baka-Chan Bot — Instagram Mode\x1b\x5c");

const path = require("path");
const axios = require("axios");
const gradient = require("gradient-string");
const { existsSync, writeFileSync, watch } = require("fs-extra");

// ─── Utils / globals from Goat.js ────────────────────────────────────────────
const {
  log, logColor, getPrefix, createOraDots, jsonStringifyColor,
  getText, convertTime, colors, randomString,
} = global.utils;

const { callbackListenTime, storage5Message } = global.GoatBot;
const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const currentVersion = require(`${process.cwd()}/package.json`).version;

// ─── Terminal banner helpers (mirror of login.js) ────────────────────────────
function centerText(text, length) {
  const width = process.stdout.columns || 80;
  const leftPadding = Math.floor((width - (length || text.length)) / 2);
  const rightPadding = width - leftPadding - (length || text.length);
  console.log(
    " ".repeat(leftPadding > 0 ? leftPadding : 0) +
    text +
    " ".repeat(rightPadding > 0 ? rightPadding : 0)
  );
}

const instaTitles = [
  [
    "██████╗  █████╗ ██╗  ██╗ █████╗       ██████╗██╗  ██╗ █████╗ ███╗   ██╗",
    "██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗     ██╔════╝██║  ██║██╔══██╗████╗  ██║",
    "██████╔╝███████║█████╔╝ ███████║     ██║     ███████║███████║██╔██╗ ██║",
    "██╔══██╗██╔══██║██╔═██╗ ██╔══██║     ██║     ██╔══██║██╔══██║██║╚██╗██║",
    "██████╔╝██║  ██║██║  ██╗██║  ██║     ╚██████╗██║  ██║██║  ██║██║ ╚████║",
    "╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝      ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝",
  ],
  [
    "█▄▄ ▄▀█ █▄▀ ▄▀█   █▀▀ █ █ ▄▀█ █▄ █",
    "█▄█ █▀█ █ █ █▀█   █▄▄ █▀█ █▀█ █ ▀█",
  ],
  ["B A K A - C H A N  B O T  @" + currentVersion],
  ["BAKA-CHAN BOT"],
];

let widthConsole = process.stdout.columns || 80;
if (widthConsole > 50) widthConsole = 50;

function createLine(content, isMaxWidth = false) {
  const w = isMaxWidth ? (process.stdout.columns || 80) : widthConsole;
  if (!content) return Array(w).fill("─").join("");
  content = ` ${content.trim()} `;
  const lengthLine = w - content.length;
  let left = Math.floor(lengthLine / 2);
  if (left < 0 || isNaN(left)) left = 0;
  const lineOne = Array(left).fill("─").join("");
  return lineOne + content + lineOne;
}

const character = createLine();

// Print banner
console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
console.log();
const maxWidth = process.stdout.columns || 80;
const title = maxWidth > 58
  ? instaTitles[0]
  : maxWidth > 36
    ? instaTitles[1]
    : maxWidth > 26
      ? instaTitles[2]
      : instaTitles[3];
for (const text of title) {
  centerText(gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(text), text.length);
}
centerText(gradient("#9F98E8", "#AFF6CF")(`Baka-Chan Bot v${currentVersion} — Instagram Mode`), 45);
centerText(gradient("#9F98E8", "#AFF6CF")("Maintained by Gtajisan"), 22);
centerText(gradient("#9F98E8", "#AFF6CF")("GitHub: https://github.com/Gtajisan/baka-chan-bot"), 50);
centerText(gradient("#f5af19", "#f12711")("Contact: ffjisan804@gmail.com"), 30);
console.log();

// ─── Uptime response handlers (mirror login.js) ───────────────────────────────
let responseUptimeCurrent;

function responseUptimeSuccess(req, res) {
  res.type("json").send({ status: "success", uptime: process.uptime(), unit: "seconds" });
}
function responseUptimeError(req, res) {
  res.status(500).type("json").send({
    status: "error",
    uptime: process.uptime(),
    statusAccountBot: global.statusAccountBot,
    unit: "seconds",
  });
}
responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeError = responseUptimeError;
global.statusAccountBot = "good";

// ─── stopListening (same pattern as login.js) ─────────────────────────────────
function stopListening(keyListen) {
  keyListen = keyListen || Object.keys(callbackListenTime).pop();
  return new Promise((resolve) => {
    (global.GoatBot.fcaApi?.stopListening?.(
      () => {
        if (callbackListenTime[keyListen]) {
          callbackListenTime[keyListen] = () => {};
        }
        resolve();
      }
    )) || resolve();
  });
}

// ─── Main Instagram startup ───────────────────────────────────────────────────
(async function startInstagramBot() {
  try {
    console.log(colors.hex("#f5ab00")(createLine("START INSTAGRAM LOGIN", true)));

    // Clear Maps for relogin scenario
    global.GoatBot.commands = new Map();
    global.GoatBot.eventCommands = new Map();
    global.GoatBot.aliases = new Map();
    global.GoatBot.onChat = [];
    global.GoatBot.onEvent = [];
    global.GoatBot.onReply = new Map();
    global.GoatBot.onReaction = new Map();
    clearInterval(global.intervalRestartListenMqtt);
    delete global.intervalRestartListenMqtt;

    if (global.GoatBot.Listening) await stopListening();

    // Check credentials
    if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
      log.err("INSTAGRAM", "IG_USERNAME and IG_PASSWORD must be set in your .env file");
      log.err("INSTAGRAM", "Copy .env.example to .env and fill in your credentials");
      process.exit(1);
    }

    log.info("INSTAGRAM", `Connecting as @${process.env.IG_USERNAME}...`);

    // ── Create Instagram API ──────────────────────────────────────────────────
    const { createInstagramAPI } = require("../../instagram/adapter.js");
    const api = await createInstagramAPI();

    global.GoatBot.fcaApi = api;
    global.GoatBot.botID = api.getCurrentUserID();
    global.botID = api.getCurrentUserID();

    log.info("INSTAGRAM", `Logged in successfully ✓  botID: ${global.botID}`);

    // ── Bot info display ──────────────────────────────────────────────────────
    logColor("#f5ab00", createLine("BOT INFO"));
    log.info("NODE VERSION", process.version);
    log.info("PROJECT VERSION", currentVersion);
    log.info("BOT ID", global.botID);
    log.info("PREFIX", global.GoatBot.config.prefix);
    log.info("LANGUAGE", global.GoatBot.config.language);
    log.info("BOT NICK NAME", global.GoatBot.config.nickNameBot || "BAKA-CHAN BOT");
    log.info("PLATFORM", "Instagram DM (instagram-private-api)");

    // ── dataGban placeholder (no GBAN check on Instagram) ────────────────────
    // The GBAN list at ntkhang03/Goat-Bot-V2-Gban contains only Facebook IDs.
    // Instagram user IDs have no overlap — we skip the remote fetch entirely.
    const dataGban = {};

    // ── Load data ─────────────────────────────────────────────────────────────
    const { threadModel, userModel, dashBoardModel, globalModel,
      threadsData, usersData, dashBoardData, globalData, sequelize } =
      await require("./loadData.js")(api, createLine);

    // ── Custom scripts ────────────────────────────────────────────────────────
    await require("../custom.js")({
      api, threadModel, userModel, dashBoardModel, globalModel,
      threadsData, usersData, dashBoardData, globalData, getText,
    });

    // ── Load commands and events ──────────────────────────────────────────────
    await require("./loadScripts.js")(
      api, threadModel, userModel, dashBoardModel, globalModel,
      threadsData, usersData, dashBoardData, globalData, createLine
    );

    // ── Auto-load scripts watcher ─────────────────────────────────────────────
    if (global.GoatBot.config.autoLoadScripts?.enable === true) {
      const ignoreCmds = global.GoatBot.config.autoLoadScripts.ignoreCmds
        ?.replace(/[ ,]+/g, " ").trim().split(" ") || [];
      const ignoreEvents = global.GoatBot.config.autoLoadScripts.ignoreEvents
        ?.replace(/[ ,]+/g, " ").trim().split(" ") || [];

      watch(`${process.cwd()}/scripts/cmds`, async (event, filename) => {
        if (!filename?.endsWith(".js") || ignoreCmds.includes(filename) || filename.endsWith(".eg.js")) return;
        if ((event === "change" || event === "rename") && existsSync(`${process.cwd()}/scripts/cmds/${filename}`)) {
          try {
            const infoLoad = global.utils.loadScripts("cmds", filename.replace(".js", ""), log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
            if (infoLoad.status === "success")
              log.master("AUTO LOAD SCRIPTS", `Command ${filename} reloaded`);
            else
              log.err("AUTO LOAD SCRIPTS", `Error reloading ${filename}`, infoLoad.error);
          } catch (err) {
            log.err("AUTO LOAD SCRIPTS", `Error reloading ${filename}`, err);
          }
        }
      });

      watch(`${process.cwd()}/scripts/events`, async (event, filename) => {
        if (!filename?.endsWith(".js") || ignoreEvents.includes(filename) || filename.endsWith(".eg.js")) return;
        if ((event === "change" || event === "rename") && existsSync(`${process.cwd()}/scripts/events/${filename}`)) {
          try {
            const infoLoad = global.utils.loadScripts("events", filename.replace(".js", ""), log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
            if (infoLoad.status === "success")
              log.master("AUTO LOAD SCRIPTS", `Event ${filename} reloaded`);
            else
              log.err("AUTO LOAD SCRIPTS", `Error reloading ${filename}`, infoLoad.error);
          } catch (err) {
            log.err("AUTO LOAD SCRIPTS", `Error reloading ${filename}`, err);
          }
        }
      });
    }

    // ── Admin bot list display ────────────────────────────────────────────────
    logColor("#f5ab00", character);
    let i = 0;
    const adminBot = global.GoatBot.config.adminBot
      .filter(item => !isNaN(item))
      .map(item => item.toString());
    for (const uid of adminBot) {
      try {
        const userName = await usersData.getName(uid);
        log.master("ADMINBOT", `[${++i}] ${uid} | ${userName}`);
      } catch (_) {
        log.master("ADMINBOT", `[${++i}] ${uid}`);
      }
    }
    log.master("SUCCESS", getText("login", "runBot"));
    log.master("LOAD TIME", `${convertTime(Date.now() - global.GoatBot.startTime)}`);
    logColor("#f5ab00", createLine("COPYRIGHT"));
    console.log(
      `\x1b[1m\x1b[33mCOPYRIGHT:\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36m` +
      `Project GoatBot v2 created by ntkhang03, Baka-Chan Bot maintained by Gtajisan. ` +
      `Do not sell or claim as your own. Thank you!\x1b[0m`
    );
    logColor("#f5ab00", character);
    global.GoatBot.config.adminBot = adminBot;
    writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
    writeFileSync(global.client.dirConfigCommands, JSON.stringify(global.GoatBot.configCommands, null, 2));

    // ──────────────────── CALLBACK LISTEN ─────────────────────────────────────
    const { restartListenMqtt } = global.GoatBot.config;
    let isSendNotiErrorMessage = false;

    async function callBackListen(error, event) {
      if (error) {
        global.responseUptimeCurrent = responseUptimeError;
        if (
          error.error === "Not logged in" ||
          error.error === "Not logged in." ||
          error.error === "Connection refused: Server unavailable"
        ) {
          log.err("INSTAGRAM_LISTEN", getText("login", "notLoggedIn"), error);
          global.responseUptimeCurrent = responseUptimeError;
          global.statusAccountBot = "can't login";
          if (!isSendNotiErrorMessage) {
            try {
              await handlerWhenListenHasError({
                api, threadModel, userModel, dashBoardModel, globalModel,
                threadsData, usersData, dashBoardData, globalData, error,
              });
            } catch (_) {}
            isSendNotiErrorMessage = true;
          }
          if (global.GoatBot.config.autoRestartWhenListenMqttError) process.exit(2);
          else {
            const keyListen = Object.keys(callbackListenTime).pop();
            if (callbackListenTime[keyListen]) callbackListenTime[keyListen] = () => {};
          }
          return;
        } else if (error === "Connection closed." || error === "Connection closed by user.") {
          return;
        } else {
          try {
            await handlerWhenListenHasError({
              api, threadModel, userModel, dashBoardModel, globalModel,
              threadsData, usersData, dashBoardData, globalData, error,
            });
          } catch (_) {}
          return log.err("INSTAGRAM_LISTEN", getText("login", "callBackError"), error);
        }
      }

      global.responseUptimeCurrent = responseUptimeSuccess;
      global.statusAccountBot = "good";
      if (isSendNotiErrorMessage) isSendNotiErrorMessage = false;

      // ── Whitelist checks (identical to login.js) ──────────────────────────
      if (
        global.GoatBot.config.whiteListMode?.enable === true &&
        global.GoatBot.config.whiteListModeThread?.enable === true &&
        !global.GoatBot.config.adminBot.includes(event.senderID)
      ) {
        if (
          !global.GoatBot.config.whiteListMode.whiteListIds.includes(event.senderID) &&
          !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID) &&
          !global.GoatBot.config.adminBot.includes(event.senderID)
        ) return;
      } else if (
        global.GoatBot.config.whiteListMode?.enable === true &&
        !global.GoatBot.config.whiteListMode.whiteListIds.includes(event.senderID) &&
        !global.GoatBot.config.adminBot.includes(event.senderID)
      ) {
        return;
      } else if (
        global.GoatBot.config.whiteListModeThread?.enable === true &&
        !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID) &&
        !global.GoatBot.config.adminBot.includes(event.senderID)
      ) {
        return;
      }

      // ── listenMqtt loop-detection ─────────────────────────────────────────
      if (event.messageID && event.type === "message") {
        if (storage5Message.includes(event.messageID)) {
          Object.keys(callbackListenTime).slice(0, -1).forEach(key => {
            callbackListenTime[key] = () => {};
          });
        } else {
          storage5Message.push(event.messageID);
        }
        if (storage5Message.length > 5) storage5Message.shift();
      }

      // ── Event logging ──────────────────────────────────────────────────────
      const configLog = global.GoatBot.config.logEvents;
      if (configLog.disableAll === false && configLog[event.type] !== false) {
        const participantIDs_ = [...(event.participantIDs || [])];
        if (event.participantIDs) event.participantIDs = `Array(${event.participantIDs.length})`;
        console.log(colors.green((event.type || "").toUpperCase() + ":"), jsonStringifyColor(event, null, 2));
        if (event.participantIDs) event.participantIDs = participantIDs_;
      }

      // ── GBAN check (dataGban is empty {} for Instagram — always passes) ───
      if (dataGban[event.senderID] || dataGban[event.userID]) {
        if (event.body && event.threadID) {
          const prefix = getPrefix(event.threadID);
          if (event.body.startsWith(prefix))
            return api.sendMessage(getText("login", "userBanned"), event.threadID);
          return;
        }
        return;
      }

      // ── Dispatch event to handler ──────────────────────────────────────────
      const handlerAction = require("../handler/handlerAction.js")(
        api, threadModel, userModel, dashBoardModel, globalModel,
        usersData, threadsData, dashBoardData, globalData
      );
      handlerAction(event);
    }

    function createCallBackListen(key) {
      key = randomString(10) + (key || Date.now());
      callbackListenTime[key] = callBackListen;
      return function (error, event) {
        callbackListenTime[key](error, event);
      };
    }

    // ── Start listening ───────────────────────────────────────────────────────
    await stopListening();
    global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
    global.GoatBot.callBackListen = callBackListen;

    // ── Uptime server (from config.serverUptime) ──────────────────────────────
    if (global.GoatBot.config.serverUptime?.enable === true &&
      !global.GoatBot.config.dashBoard?.enable &&
      !global.serverUptimeRunning) {
      try {
        const http = require("http");
        const express = require("express");
        const app = express();
        const server = http.createServer(app);
        const PORT = global.GoatBot.config.dashBoard?.port ||
          (!isNaN(global.GoatBot.config.serverUptime.port) && global.GoatBot.config.serverUptime.port) ||
          3001;
        let homeHtml = "<h2>Baka-Chan Bot (Instagram) is alive!</h2>";
        try {
          const { data } = await axios.get("https://raw.githubusercontent.com/ntkhang03/resources-goat-bot/master/homepage/home.html");
          homeHtml = data;
        } catch (_) {}
        app.get("/", (req, res) => res.send(homeHtml));
        app.get("/uptime", (req, res) => global.responseUptimeCurrent(req, res));
        let nameUpTime = `https://${process.env.REPL_OWNER
          ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : process.env.API_SERVER_EXTERNAL === "https://api.glitch.com"
            ? `${process.env.PROJECT_DOMAIN}.glitch.me`
            : `localhost:${PORT}`}`;
        if (nameUpTime.includes("localhost")) nameUpTime = nameUpTime.replace("https", "http");
        await server.listen(PORT);
        log.info("UPTIME", getText("login", "openServerUptimeSuccess", nameUpTime));
        global.serverUptimeRunning = true;
      } catch (err) {
        log.err("UPTIME", getText("login", "openServerUptimeError"), err);
      }
    }

    // ── Restart listener interval ─────────────────────────────────────────────
    if (restartListenMqtt?.enable === true) {
      if (restartListenMqtt.logNoti === true) {
        log.info("INSTAGRAM_LISTEN", getText("login", "restartListenMessage", convertTime(restartListenMqtt.timeRestart, true)));
        log.info("BOT_STARTED", getText("login", "startBotSuccess"));
        logColor("#f5ab00", character);
      }
      const restart = setInterval(async () => {
        if (restartListenMqtt.enable === false) {
          clearInterval(restart);
          return log.warn("INSTAGRAM_LISTEN", getText("login", "stopRestartListenMessage"));
        }
        try {
          await stopListening();
          await sleep(restartListenMqtt.delayAfterStopListening || 1000);
          global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
          log.info("INSTAGRAM_LISTEN", getText("login", "restartListenMessage2"));
        } catch (e) {
          log.err("INSTAGRAM_LISTEN", getText("login", "restartListenMessageError"), e);
        }
      }, restartListenMqtt.timeRestart);
      global.intervalRestartListenMqtt = restart;
    }

    // ── Auto-uptime pinger ───────────────────────────────────────────────────
    require("../autoUptime.js");

    // ── Expose reLogin ───────────────────────────────────────────────────────
    global.GoatBot.reLoginBot = startInstagramBot;

  } catch (err) {
    log.err("INSTAGRAM_LOGIN", `Fatal error during Instagram startup: ${err.message}`, err);
    process.exit(1);
  }
})();
