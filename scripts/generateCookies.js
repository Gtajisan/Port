#!/usr/bin/env node
"use strict";

/**
 * Baka-Chan Bot — Auto-Generate Instagram Cookies
 *
 * This script uses a headless browser (Puppeteer) to:
 *  1. Log into Instagram automatically
 *  2. Extract session cookies
 *  3. Save to ig_cookies.json
 *
 * Run from your LOCAL machine (PC/Mac), NOT on Replit.
 *
 * Usage:
 *   IG_USERNAME=your_username IG_PASSWORD=your_password node scripts/generateCookies.js
 *
 * Or interactively:
 *   node scripts/generateCookies.js
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function generateCookies() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Baka-Chan — Auto Instagram Cookie Generator 🍪  ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  let username = process.env.IG_USERNAME;
  let password = process.env.IG_PASSWORD;

  if (!username) username = await ask("Instagram username: ");
  if (!password) password = await ask("Instagram password: ");

  try {
    const puppeteer = require("puppeteer-extra");
    const StealthPlugin = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(StealthPlugin());

    console.log("\n🔧 Launching browser...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
    );

    console.log("🌐 Opening Instagram...");
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for login form
    await page.waitForSelector("input[name='username']", { timeout: 10000 });

    console.log(`📝 Logging in as @${username}...`);
    await page.type("input[name='username']", username, { delay: 50 });
    await page.type("input[name='password']", password, { delay: 50 });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for login to complete (redirect to home or show error)
    let loginSuccess = false;
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
        page.waitForSelector('[aria-label="Explore"]', { timeout: 15000 }),
        page.waitForSelector('[aria-label="Home"]', { timeout: 15000 }),
      ]);
      loginSuccess = true;
    } catch (e) {
      // Check if we're on the home page despite navigation timeout
      try {
        await page.waitForSelector('[aria-label="Home"]', { timeout: 5000 });
        loginSuccess = true;
      } catch (_) {}
    }

    if (!loginSuccess) {
      const errorText = await page.evaluate(() => {
        const err = document.querySelector('[role="alert"]');
        return err ? err.textContent : "Unknown error";
      });
      throw new Error(`Login failed: ${errorText || "Check credentials"}`);
    }

    console.log("✅ Login successful! Extracting cookies...");

    // Get all cookies
    const cookies = await page.cookies();
    const filteredCookies = cookies
      .filter(c => !c.domain || c.domain.includes("instagram.com"))
      .map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain || ".instagram.com",
        path: c.path || "/",
        expires: c.expires || Date.now() / 1000 + 365 * 24 * 3600,
        httpOnly: c.httpOnly || false,
        secure: c.secure || true,
        sameSite: c.sameSite || "Lax",
      }));

    // Save to file
    const outputPath = path.join(process.cwd(), "ig_cookies.json");
    fs.writeFileSync(outputPath, JSON.stringify(filteredCookies, null, 2));

    console.log(`\n✅ SUCCESS! Cookies saved to: ${outputPath}`);
    console.log(`   Cookies count: ${filteredCookies.length}`);
    console.log(`   Key cookies: ${filteredCookies.map(c => c.name).slice(0, 5).join(", ")}...\n`);

    console.log("📋 Next steps:");
    console.log("   1. Copy ig_cookies.json to your Replit project root");
    console.log("   2. Restart the bot — it will use cookies automatically\n");

    await browser.close();
    rl.close();
  } catch (err) {
    console.error("\n❌ Failed:", err.message);
    console.log("\nTroubleshooting:");
    console.log("  • Make sure you're running this on your LOCAL machine, not Replit");
    console.log("  • Verify username and password are correct");
    console.log("  • If you have 2FA enabled, disable it temporarily or use an app password");
    console.log("  • Try running again — Instagram sometimes blocks repeated logins\n");
    rl.close();
    process.exit(1);
  }
}

generateCookies();
