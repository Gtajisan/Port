#!/usr/bin/env node
"use strict";

/**
 * Baka-Chan Bot — Instagram Cookie Importer
 *
 * Converts browser-exported Instagram cookies into a session.json file
 * that Baka-Chan can use directly.
 *
 * Supported input formats:
 *   1. Browser extension cookie export (JSON array with name/value/domain)
 *   2. Chrome DevTools cookies (same format)
 *   3. EditThisCookie / Cookie-Editor exports
 *
 * HOW TO EXPORT COOKIES FROM BROWSER:
 *   1. Log into Instagram in Chrome/Firefox
 *   2. Install "Cookie-Editor" or "EditThisCookie" browser extension
 *   3. Click the extension → Export → Copy as JSON
 *   4. Paste into a file called  ig_cookies.json  in the project root
 *   5. Run: node scripts/importCookies.js
 *
 * NOTE: ig_cookies.json is DIFFERENT from Facebook fbstate/appstate.
 *   Facebook fbstate = fb.com cookies only
 *   Instagram cookies = instagram.com cookies (sessionid, csrftoken, ds_user_id, etc.)
 *
 * Usage:
 *   node scripts/importCookies.js [path/to/cookies.json]
 */

require("dotenv").config();

const fs   = require("fs");
const path = require("path");

const crypto = require("crypto");

const COOKIES_FILE = process.argv[2] || path.join(process.cwd(), "ig_cookies.json");
const SESSION_FILE = path.join(process.cwd(), "session.json");

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.SESSION_SECRET || "baka-chan-default-secret-key-32b!!";
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Required Instagram cookies
const REQUIRED = ["sessionid", "ds_user_id", "csrftoken"];

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Baka-Chan — Instagram Cookie Importer 🍪       ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(COOKIES_FILE)) {
    console.error(`❌ Cookie file not found: ${COOKIES_FILE}`);
    console.log("\nHow to get your Instagram cookies:");
    console.log("  1. Open Chrome/Firefox and log into instagram.com");
    console.log("  2. Install 'Cookie-Editor' extension");
    console.log("  3. Click the extension → Export → Copy JSON");
    console.log(`  4. Paste into: ${COOKIES_FILE}`);
    console.log("  5. Run this script again\n");
    process.exit(1);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf8"));
  } catch (e) {
    console.error("❌ Invalid JSON in cookie file:", e.message);
    process.exit(1);
  }

  // Normalize to flat array
  let cookies = Array.isArray(raw) ? raw
    : raw.cookies ? raw.cookies
    : raw.body   ? raw.body
    : null;

  if (!cookies || !cookies.length) {
    console.error("❌ No cookies found in file. Make sure it's a JSON array of cookie objects.");
    process.exit(1);
  }

  // Filter to Instagram cookies only
  const igCookies = cookies.filter(c =>
    (c.domain || "").includes("instagram.com") || !c.domain
  );

  if (!igCookies.length) {
    console.warn("⚠️  No instagram.com cookies found. Using all cookies as-is.");
  }

  const cookieMap = {};
  (igCookies.length ? igCookies : cookies).forEach(c => {
    if (c.name && c.value) cookieMap[c.name] = c.value;
  });

  // Check for required cookies
  const missing = REQUIRED.filter(k => !cookieMap[k]);
  if (missing.length) {
    console.error(`❌ Missing required Instagram cookies: ${missing.join(", ")}`);
    console.log("\nMake sure you are logged into instagram.com before exporting cookies.");
    process.exit(1);
  }

  const userID = cookieMap["ds_user_id"] || "0";
  const username = process.env.IG_USERNAME || "bot";

  console.log(`✅ Found cookies for user ID: ${userID}`);
  console.log(`   sessionid: ${cookieMap["sessionid"].slice(0, 20)}...`);
  console.log(`   csrftoken: ${cookieMap["csrftoken"].slice(0, 20)}...`);

  // Try to build a valid instagram-private-api state
  try {
    const { IgApiClient } = require("instagram-private-api");
    const ig = new IgApiClient();
    ig.state.generateDevice(username);

    // Inject cookies into the jar
    const cookieJar = ig.state.cookieJar;
    const cookieUrl = "https://www.instagram.com";

    for (const c of (igCookies.length ? igCookies : cookies)) {
      if (!c.name || !c.value) continue;
      try {
        cookieJar.setCookieSync(
          `${c.name}=${c.value}; Domain=.instagram.com; Path=/`,
          cookieUrl
        );
      } catch (_) {}
    }

    const serialized = await ig.state.serialize();
    delete serialized.constants;

    const sessionData = { state: serialized, userID };
    const encrypted = encrypt(JSON.stringify(sessionData));
    fs.writeFileSync(SESSION_FILE, encrypted, "utf8");

    console.log(`\n✅ session.json written successfully!`);
    console.log(`   Path: ${SESSION_FILE}`);
    console.log("\nRestart your bot — it will use this session automatically.\n");

    // Also print base64 for IG_SESSION_STATE
    const b64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    console.log("Optionally, add this as IG_SESSION_STATE secret in Replit:");
    console.log("─────────── BEGIN SESSION VALUE ───────────");
    console.log(b64.slice(0, 100) + "...(truncated, see session.json)");
    console.log("────────────── END SESSION VALUE ──────────");
    console.log("\nFor full base64: node -e \"console.log(require('fs').readFileSync('session.json','utf8'))\" | ... (use exportSession.js instead)\n");

  } catch (err) {
    console.error("❌ Failed to build session:", err.message);
    console.log("Try running scripts/exportSession.js on your local machine instead.");
    process.exit(1);
  }
}

main();
