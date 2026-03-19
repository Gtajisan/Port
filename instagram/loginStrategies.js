"use strict";

/**
 * Baka-Chan Bot — Multi-Strategy Instagram Login
 *
 * Tries every available login method in order until one succeeds.
 * This makes the bot work reliably on cloud servers (Replit, Railway, Render, etc.)
 * where Instagram often blocks standard private-API logins from data center IPs.
 *
 * Strategy order:
 *  1. IG_SESSION_STATE env var  — pre-exported session (most reliable on cloud)
 *  2. session.json file          — encrypted saved session (restores without re-login)
 *  3. ig_cookies.json            — raw browser cookie import
 *  4. instagram-private-api      — standard private API login (with UA rotation)
 *  5. instagram-web-api          — web-based login (different endpoint, different IP pattern)
 *  6. ig-api                     — lightweight alternative API client
 */

const fs   = require("fs");
const path = require("path");
const logger = require("./logger.js");

const COOKIES_FILE  = path.join(process.cwd(), "ig_cookies.json");
const SESSION_FILE  = path.join(process.cwd(), "session.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function jitter(base = 1000, spread = 2000) {
  return base + Math.random() * spread;
}

// Mobile user-agent pool — rotated per login attempt to avoid fingerprinting
const MOBILE_USER_AGENTS = [
  "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
  "Instagram 289.0.0.20.118 Android (30/11; 420dpi; 1080x2220; OnePlus; HD1913; OnePlus7Pro; qcom; en_US; 479692943)",
  "Instagram 262.0.0.20.108 Android (29/10; 480dpi; 1080x2280; Xiaomi; M2012K11AG; alioth; qcom; en_US; 432226180)",
  "Instagram 278.1.0.16.107 Android (32/12; 560dpi; 1440x3120; samsung; SM-S908B; b0s; exynos2200; en_US; 461576628)",
  "Instagram 291.0.0.34.111 Android (31/12; 420dpi; 1080x2400; Google; Pixel 7; panther; tensor; en_US; 483508629)",
];

function randomUA() {
  return MOBILE_USER_AGENTS[Math.floor(Math.random() * MOBILE_USER_AGENTS.length)];
}

// ─── Strategy 1: IG_SESSION_STATE env var ───────────────────────────────────
async function strategyEnvState() {
  const raw = process.env.IG_SESSION_STATE;
  if (!raw) return null;

  logger.info("LOGIN", "Strategy 1: Loading session from IG_SESSION_STATE env var...");
  try {
    const { IgApiClient } = require("instagram-private-api");
    const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || "baka_chan_bot");
    await ig.state.deserialize(data.state);
    const user = await ig.account.currentUser();
    logger.info("LOGIN", `Strategy 1 SUCCESS — logged in as @${user.username} (pk: ${user.pk})`);
    return { ig, userID: String(user.pk), method: "env-session-state" };
  } catch (err) {
    logger.warn("LOGIN", `Strategy 1 FAILED: ${err.message}`);
    return null;
  }
}

// ─── Strategy 2: Encrypted session.json ─────────────────────────────────────
async function strategySessionFile(loadSessionFn) {
  logger.info("LOGIN", "Strategy 2: Loading session from session.json...");
  try {
    const data = loadSessionFn();
    if (!data) { logger.warn("LOGIN", "Strategy 2 FAILED: No session.json found"); return null; }

    const { IgApiClient } = require("instagram-private-api");
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || "baka_chan_bot");
    await ig.state.deserialize(data.state);
    const user = await ig.account.currentUser();
    logger.info("LOGIN", `Strategy 2 SUCCESS — session restored as @${user.username}`);
    return { ig, userID: String(user.pk), method: "session-file" };
  } catch (err) {
    logger.warn("LOGIN", `Strategy 2 FAILED: ${err.message}`);
    return null;
  }
}

// ─── Strategy 3: ig_cookies.json browser cookie import ──────────────────────
async function strategyCookieFile() {
  if (!fs.existsSync(COOKIES_FILE)) {
    logger.warn("LOGIN", "Strategy 3 SKIPPED: ig_cookies.json not found");
    return null;
  }
  logger.info("LOGIN", "Strategy 3: Importing cookies from ig_cookies.json...");
  try {
    const { IgApiClient } = require("instagram-private-api");
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf8"));

    // Support multiple cookie export formats
    let cookieArray = Array.isArray(cookies) ? cookies
      : cookies.cookies ? cookies.cookies
      : cookies.body ? cookies.body
      : null;

    if (!cookieArray) throw new Error("Unrecognised cookie file format");

    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || "baka_chan_bot");

    // Build cookie jar string
    const cookieStr = cookieArray
      .filter(c => c.name && c.value)
      .map(c => `${c.name}=${c.value}`)
      .join("; ");

    await ig.state.deserialize({
      cookieJarJSON: { cookies: cookieArray },
    });

    const user = await ig.account.currentUser();
    logger.info("LOGIN", `Strategy 3 SUCCESS — cookies imported as @${user.username}`);
    return { ig, userID: String(user.pk), method: "cookie-file" };
  } catch (err) {
    logger.warn("LOGIN", `Strategy 3 FAILED: ${err.message}`);
    return null;
  }
}

// ─── Strategy 4: instagram-private-api fresh login (with UA rotation) ────────
async function strategyPrivateAPI(saveSessionFn) {
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;
  if (!username || !password) {
    logger.warn("LOGIN", "Strategy 4 SKIPPED: IG_USERNAME or IG_PASSWORD not set");
    return null;
  }
  logger.info("LOGIN", `Strategy 4: Fresh login via instagram-private-api as @${username}...`);

  const { IgApiClient } = require("instagram-private-api");

  // Try up to 3 times with different user agents
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ig = new IgApiClient();
      const ua = randomUA();
      ig.state.generateDevice(username);
      ig.request.defaults.headers["User-Agent"] = ua;
      ig.state.proxyUrl = process.env.IG_PROXY || undefined;

      logger.info("LOGIN", `  Attempt ${attempt}/3 with UA: ${ua.slice(0, 50)}...`);

      try { await ig.simulate.preLoginFlow(); } catch (_) {}
      await sleep(jitter(800, 1500));

      const account = await ig.account.login(username, password);
      await sleep(jitter(500, 1000));

      try { await ig.simulate.postLoginFlow(); } catch (_) {}

      const serialized = await ig.state.serialize();
      delete serialized.constants;
      saveSessionFn({ state: serialized, userID: String(account.pk) });

      logger.info("LOGIN", `Strategy 4 SUCCESS — logged in as @${username} (pk: ${account.pk})`);
      return { ig, userID: String(account.pk), method: "private-api-fresh" };
    } catch (err) {
      const name = err.constructor ? err.constructor.name : "Error";
      logger.warn("LOGIN", `  Attempt ${attempt}/3 FAILED [${name}]: ${err.message}`);

      if (name === "IgLoginInvalidUserError") {
        logger.error("LOGIN",
          `Account '@${username}' not found on Instagram.\n` +
          `  Verify at: https://www.instagram.com/${username}/`
        );
        return null; // No point retrying
      }
      if (name === "IgLoginBadPasswordError") {
        logger.error("LOGIN", `Wrong password for '@${username}'. Update IG_PASSWORD in Secrets.`);
        return null; // No point retrying
      }
      if (name === "IgCheckpointError") {
        logger.error("LOGIN",
          `Instagram checkpoint required for '@${username}'.\n` +
          `  1. Log in via browser at instagram.com\n` +
          `  2. Complete any security verification\n` +
          `  3. Export your session (see README → Session Export)\n` +
          `  4. Paste it as IG_SESSION_STATE secret`
        );
        return null; // No point retrying
      }
      if (name === "IgLoginTwoFactorRequiredError") {
        logger.error("LOGIN",
          `2FA is enabled on '@${username}'.\n` +
          `  Set IG_2FA_SECRET in Replit Secrets with your TOTP base32 key.`
        );
        return null;
      }

      if (attempt < 3) {
        const wait = 3000 * attempt;
        logger.warn("LOGIN", `  Waiting ${wait}ms before retry...`);
        await sleep(wait);
      }
    }
  }
  return null;
}

// ─── Strategy 5: instagram-web-api (web endpoint, different IP pattern) ──────
async function strategyWebAPI() {
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;
  if (!username || !password) {
    logger.warn("LOGIN", "Strategy 5 SKIPPED: IG_USERNAME or IG_PASSWORD not set");
    return null;
  }
  logger.info("LOGIN", `Strategy 5: Web API login as @${username}...`);
  try {
    const Instagram = require("instagram-web-api");
    const client = new Instagram({ username, password });
    await client.login();

    // instagram-web-api doesn't give us a pk directly — fetch it
    const profile = await client.getProfile();
    const userID = String(profile.id || profile.pk || "0");

    logger.info("LOGIN", `Strategy 5 SUCCESS — web API connected as @${username}`);

    // Wrap instagram-web-api into an FCA-compatible shape via adapter
    // The adapter will use the ig client internally
    return { igWeb: client, userID, method: "web-api", username };
  } catch (err) {
    logger.warn("LOGIN", `Strategy 5 FAILED: ${err.message}`);
    return null;
  }
}

// ─── Strategy 6: ig-api (lightweight alternative) ────────────────────────────
async function strategyIgApi() {
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;
  if (!username || !password) {
    logger.warn("LOGIN", "Strategy 6 SKIPPED: IG_USERNAME or IG_PASSWORD not set");
    return null;
  }
  logger.info("LOGIN", `Strategy 6: ig-api login as @${username}...`);
  try {
    const IgApi = require("ig-api");
    const ig = new IgApi();
    await ig.login(username, password);
    const self = await ig.self.info();
    const userID = String(self.id || self.pk || "0");

    logger.info("LOGIN", `Strategy 6 SUCCESS — ig-api connected as @${username} (id: ${userID})`);
    return { igLite: ig, userID, method: "ig-api", username };
  } catch (err) {
    logger.warn("LOGIN", `Strategy 6 FAILED: ${err.message}`);
    return null;
  }
}

// ─── Master login — tries all strategies in order ────────────────────────────
async function tryAllStrategies(loadSessionFn, saveSessionFn) {
  logger.info("LOGIN", "=== Baka-Chan Multi-Strategy Instagram Login ===");
  logger.info("LOGIN", "Trying all available login methods...\n");

  const strategies = [
    () => strategyEnvState(),
    () => strategySessionFile(loadSessionFn),
    () => strategyCookieFile(),
    () => strategyPrivateAPI(saveSessionFn),
    () => strategyWebAPI(),
    () => strategyIgApi(),
  ];

  for (let i = 0; i < strategies.length; i++) {
    const result = await strategies[i]();
    if (result) {
      logger.info("LOGIN", `\n✅ Login successful via: ${result.method}`);
      return result;
    }
    if (i < strategies.length - 1) {
      logger.info("LOGIN", `Trying next strategy...\n`);
      await sleep(1000);
    }
  }

  logger.error("LOGIN", `\n❌ All ${strategies.length} login strategies failed.\n`);
  logger.error("LOGIN",
    "=== HOW TO FIX ===\n" +
    "Cloud servers (Replit, Railway, Render) are often blocked by Instagram.\n" +
    "The most reliable fix is to export a session from your local machine:\n\n" +
    "  1. On your local PC/Mac, run:\n" +
    "     node scripts/exportSession.js\n\n" +
    "  2. It will print a long base64 string.\n\n" +
    "  3. Copy that string and add it as a Replit Secret:\n" +
    "     Name: IG_SESSION_STATE\n" +
    "     Value: (the base64 string)\n\n" +
    "  4. Restart the bot — it will use the session without re-logging in.\n\n" +
    "See README.md → Troubleshooting for full details."
  );

  throw new Error("All Instagram login strategies exhausted. See logs above for fix instructions.");
}

module.exports = { tryAllStrategies, strategyEnvState, strategySessionFile, strategyCookieFile, strategyPrivateAPI, strategyWebAPI, strategyIgApi };
