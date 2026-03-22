/**
 * Baka-Chan Bot — Universal launcher with keep-alive & auto-restart
 * Instagram mode: INSTAGRAM_MODE=true in environment
 * Maintained by Gtajisan <ffjisan804@gmail.com>
 */

"use strict";

const { spawn } = require("child_process");
const express = require("express");
const axios = require("axios");
const path = require("path");

// Logger — graceful fallback if logger not yet available
let log;
try {
  log = require("./logger/log.js");
} catch (_) {
  log = {
    info: (m) => console.log("[INFO]", m),
    error: (m) => console.error("[ERROR]", m),
    warn: (m) => console.warn("[WARN]", m),
  };
}

// Determine mode early (before startServer references it)
global.countRestart = global.countRestart || 0;
const INSTAGRAM_MODE = (process.env.INSTAGRAM_MODE || "true").toLowerCase() !== "false";
const BOT_ENTRY = INSTAGRAM_MODE ? "Goat.ig.js" : "Goat.js";

/* ─────────────────────────────────────────────────────────────────────────────
   HTTP Server — dashboard + health + admin API
───────────────────────────────────────────────────────────────────────────── */
function startServer() {
  const PORT = parseInt(process.env.PORT, 10) || 3000;
  const app = express();
  app.use(express.json());

  /* ── Static home page ── */
  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  /* ── Health check ── */
  app.get("/health", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), mode: INSTAGRAM_MODE ? "instagram" : "facebook" });
  });

  /* ── Status ── */
  app.get("/status", (_req, res) => {
    res.json({
      status: "running",
      uptime: Math.floor(process.uptime()),
      restarts: global.countRestart,
      port: PORT,
      mode: INSTAGRAM_MODE ? "instagram" : "facebook",
      maintainer: "Gtajisan",
    });
  });

  /* ── Admin dashboard HTML ── */
  app.get("/admin", (_req, res) => {
    res.sendFile(path.join(__dirname, "admin/dashboard.html"));
  });

  /* ── Admin API: dashboard summary ── */
  app.get("/admin/api/dashboard", (_req, res) => {
    const stats = global.adminStats;
    const dashboard = stats ? stats.getDashboard() : {};
    res.json({
      status: "running",
      uptime: Math.round(process.uptime() * 1000),
      restarts: global.countRestart,
      mode: INSTAGRAM_MODE ? "instagram" : "facebook",
      botUsername: global.GoatBot?.botUsername || null,
      authMethod: global.GoatBot?.authMethod || null,
      threads: stats ? stats.threads.size : 0,
      users: stats ? stats.users.size : 0,
      messages: stats ? stats.messages : 0,
      messagesToday: stats ? stats.messagesToday : 0,
      hourlyMessages: stats ? stats.hourlyMessages : Array(24).fill(0),
      recentThreads: dashboard.recentThreads || [],
    });
  });

  /* ── Admin API: all threads ── */
  app.get("/admin/api/threads", (_req, res) => {
    const stats = global.adminStats;
    const threads = stats
      ? Array.from(stats.threads.values()).sort((a, b) => b.lastActivity - a.lastActivity)
      : [];
    res.json({ threads });
  });

  /* ── Admin API: all users ── */
  app.get("/admin/api/users", (_req, res) => {
    const stats = global.adminStats;
    const users = stats
      ? Array.from(stats.users.values()).sort((a, b) => b.lastSeen - a.lastSeen)
      : [];
    res.json({ users });
  });

  /* ── Admin API: message stats ── */
  app.get("/admin/api/messages", (_req, res) => {
    const stats = global.adminStats;
    res.json({
      total: stats ? stats.messages : 0,
      today: stats ? stats.messagesToday : 0,
      hourly: stats ? stats.hourlyMessages : Array(24).fill(0),
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    log.info(`Baka-Chan server listening on port ${PORT}`);
    log.info(`Admin dashboard: http://localhost:${PORT}/admin`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log.error(`Port ${PORT} already in use. Retrying in 2s...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, "0.0.0.0");
      }, 2000);
    } else {
      throw err;
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Self-ping (prevents sleeping on free-tier hosting)
───────────────────────────────────────────────────────────────────────────── */
function startSelfPing() {
  const APP_URL = process.env.APP_URL;
  if (!APP_URL) return;
  setInterval(() => {
    axios.get(APP_URL + "/health").catch(() => {});
  }, 5 * 60 * 1000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bot process — auto-restart on crash
───────────────────────────────────────────────────────────────────────────── */
function startProject(message) {
  if (message) {
    const msg = INSTAGRAM_MODE ? `[Instagram] ${message}` : message;
    log.info(msg);
  }

  const child = spawn("node", [BOT_ENTRY], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, INSTAGRAM_MODE: INSTAGRAM_MODE ? "true" : "false" },
  });

  child.on("close", (code) => {
    global.countRestart++;
    if (code !== 0) {
      log.error(`Bot crashed (code ${code}). Restart #${global.countRestart} in 3s...`);
    } else {
      log.info(`Bot exited cleanly. Restart #${global.countRestart} in 3s...`);
    }
    setTimeout(() => startProject(), 3000);
  });

  child.on("error", (err) => {
    log.error(`Launcher error: ${err.message}`);
    setTimeout(() => startProject(), 5000);
  });
}

/* ── Entry Point ── */
startServer();
startSelfPing();
startProject("Starting Baka-Chan bot...");
