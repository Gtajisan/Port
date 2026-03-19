#!/usr/bin/env node
"use strict";

/**
 * Baka-Chan Bot — Instagram Session Exporter
 *
 * Run this LOCALLY (on your PC/Mac/phone, NOT on Replit) to log into Instagram
 * and export a session that can be pasted into Replit Secrets as IG_SESSION_STATE.
 *
 * This bypasses the cloud IP block issue — Instagram allows login from your
 * home/mobile IP. The exported session then works from any server.
 *
 * Usage:
 *   node scripts/exportSession.js
 *
 * Requirements:
 *   npm install instagram-private-api dotenv
 */

require("dotenv").config();

const readline = require("readline");
const { IgApiClient, IgCheckpointError, IgLoginTwoFactorRequiredError } = require("instagram-private-api");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Baka-Chan — Instagram Session Exporter 🎀      ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Run this on your LOCAL machine (PC/Mac), NOT on Replit.\n");

  const username = process.env.IG_USERNAME || await ask("Instagram username: ");
  const password = process.env.IG_PASSWORD || await ask("Instagram password: ");

  console.log(`\nLogging in as @${username}...`);

  const ig = new IgApiClient();
  ig.state.generateDevice(username);

  try {
    // Simulate pre-login flow (human-like behaviour)
    await ig.simulate.preLoginFlow();
    await sleep(1000 + Math.random() * 1000);

    await ig.account.login(username, password);
    await sleep(500 + Math.random() * 500);

    try { await ig.simulate.postLoginFlow(); } catch (_) {}

    const user = await ig.account.currentUser();
    console.log(`\n✅ Logged in as @${user.username} (ID: ${user.pk})`);

    // Serialize state
    const serialized = await ig.state.serialize();
    delete serialized.constants;

    const sessionData = { state: serialized, userID: String(user.pk) };
    const b64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");

    console.log("\n════════════════════════════════════════════════════");
    console.log("✅ SESSION EXPORT COMPLETE");
    console.log("════════════════════════════════════════════════════\n");
    console.log("Copy the entire value below and paste it into:");
    console.log("  Replit → Secrets → IG_SESSION_STATE\n");
    console.log("─────────── BEGIN SESSION VALUE ───────────");
    console.log(b64);
    console.log("────────────── END SESSION VALUE ──────────\n");
    console.log("After adding the secret, restart your bot on Replit.");
    console.log("The bot will use this session and skip login.\n");

  } catch (err) {
    if (err instanceof IgCheckpointError) {
      console.log("\n⚠️  Instagram requires a security check.");
      console.log("   Opening challenge...");
      try {
        await ig.challenge.auto(true);
        const code = await ask("Enter the verification code Instagram sent you: ");
        await ig.challenge.sendSecurityCode(code);
        const user = await ig.account.currentUser();
        console.log(`\n✅ Challenge passed! Logged in as @${user.username}`);

        const serialized = await ig.state.serialize();
        delete serialized.constants;
        const sessionData = { state: serialized, userID: String(user.pk) };
        const b64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");

        console.log("\n─────────── BEGIN SESSION VALUE ───────────");
        console.log(b64);
        console.log("────────────── END SESSION VALUE ──────────\n");
      } catch (e2) {
        console.error("Challenge failed:", e2.message);
      }
    } else if (err instanceof IgLoginTwoFactorRequiredError) {
      console.log("\n⚠️  2FA is enabled on this account.");
      const twoFactorInfo = err.response.body.two_factor_info;
      const verificationMethod = twoFactorInfo.totp_two_factor_on ? "app" : "SMS";
      console.log(`   Verification method: ${verificationMethod}`);
      const code = await ask(`Enter 2FA code from your ${verificationMethod}: `);
      try {
        await ig.account.twoFactorLogin({
          username,
          verificationCode: code,
          twoFactorIdentifier: twoFactorInfo.two_factor_identifier,
          verificationMethod: twoFactorInfo.totp_two_factor_on ? "3" : "1",
          trustThisDevice: "1",
        });
        const user = await ig.account.currentUser();
        console.log(`\n✅ 2FA passed! Logged in as @${user.username}`);

        const serialized = await ig.state.serialize();
        delete serialized.constants;
        const sessionData = { state: serialized, userID: String(user.pk) };
        const b64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");

        console.log("\n─────────── BEGIN SESSION VALUE ───────────");
        console.log(b64);
        console.log("────────────── END SESSION VALUE ──────────\n");
      } catch (e2) {
        console.error("2FA failed:", e2.message);
      }
    } else {
      console.error("\n❌ Login failed:", err.message);
      console.log("\nCommon fixes:");
      console.log("  • Make sure you're running this on your LOCAL machine, not Replit");
      console.log("  • Double check your username and password");
      console.log("  • Try logging in via the Instagram app first to clear any flags");
    }
  }

  rl.close();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
