/**
 * Baka-Chan Bot universal launcher with keep-alive & auto-restart
 * Maintained by Gtajisan <ffjisan804@gmail.com>
 */

const { spawn } = require("child_process");
const log = require("./logger/log.js");
const express = require("express");
const axios = require("axios");
const path = require("path");

/* ─── Keep-alive HTTP server ─── */
function startServer() {
  // Use platform PORT or default to 5000
  const PORT = parseInt(process.env.PORT, 10) || 5000;

  const app = express();

  app.get("/", (req, res) => {
    try {
      res.sendFile(path.join(__dirname, "index.html"));
    } catch {
      res.send("🎀 Baka-Chan Bot is running and alive 24/7!");
    }
  });

  app.get("/status", (req, res) => {
    res.json({
      status: "running",
      uptime: process.uptime(),
      restarts: global.countRestart || 0,
      port: PORT,
      mode: INSTAGRAM_MODE ? "instagram" : "facebook",
      maintainer: "Gtajisan",
      email: "ffjisan804@gmail.com"
    });
  });

  app.get("/health", (req, res) => {
    res.json({ ok: true, uptime: process.uptime(), mode: INSTAGRAM_MODE ? "instagram" : "facebook" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    log.info
      ? log.info(`Baka-Chan server started on port ${PORT}`)
      : console.log(`Baka-Chan server started on port ${PORT}`);
  });
}

/* ─── Self-ping to prevent Render sleeping ─── */
function startSelfPing() {
  const APP_URL = process.env.APP_URL;
  if (!APP_URL) {
    log.info ? log.info("No APP_URL set, skipping self-ping.") : console.log("No APP_URL set, skipping self-ping.");
    return;
  }

  setInterval(() => {
    axios.get(APP_URL).catch(() => {
      log.error ? log.error("Self-ping failed") : console.error("Self-ping failed");
    });
  }, 5 * 60 * 1000); // every 5 min
}

/* ─── Bot Auto-Restart Logic ─── */
global.countRestart = global.countRestart || 0;

const INSTAGRAM_MODE = (process.env.INSTAGRAM_MODE || "").toLowerCase() === "true";
const BOT_ENTRY = INSTAGRAM_MODE ? "Goat.ig.js" : "Goat.js";

function startProject(message) {
  if (message) {
    const msg = INSTAGRAM_MODE ? `[Instagram Mode] ${message}` : message;
    log.info ? log.info(msg) : console.log(msg);
  }

  const child = spawn("node", [BOT_ENTRY], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    if (code !== 0) {
      global.countRestart++;
      log.error
        ? log.error(`Baka-Chan crashed with code ${code}. Restarting... (#${global.countRestart})`)
        : console.error(`Baka-Chan crashed with code ${code}. Restarting... (#${global.countRestart})`);

      setTimeout(() => startProject(), 3000);
    } else {
      log.info ? log.info("Baka-Chan exited cleanly.") : console.log("Baka-Chan exited cleanly.");
      // Relaunch anyway to stay alive
      setTimeout(() => startProject(), 3000);
    }
  });

  child.on("error", (err) => {
    log.error ? log.error(`Launcher error: ${err.message}`) : console.error(`Launcher error: ${err.message}`);
    setTimeout(() => startProject(), 5000);
  });
}

/* ─── Entry Point ─── */
startServer();
startSelfPing();
startProject("Starting Baka-Chan bot...");
