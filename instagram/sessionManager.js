"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger.js");
const { tryAllStrategies } = require("./loginStrategies.js");

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

function decrypt(text) {
  const [ivHex, encHex] = text.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid session file format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function saveSession(sessionData) {
  try {
    const json = JSON.stringify(sessionData);
    const encrypted = encrypt(json);
    fs.writeFileSync(SESSION_FILE, encrypted, "utf8");
    logger.info("SESSION", "Session saved to session.json (encrypted)");
  } catch (err) {
    logger.error("SESSION", `Failed to save session: ${err.message}`);
  }
}

function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8").trim();
    if (!raw) return null;
    try {
      const json = decrypt(raw);
      return JSON.parse(json);
    } catch (_) {
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn("SESSION", `Could not read session.json (${err.message})`);
    return null;
  }
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    logger.info("SESSION", "Session file cleared");
  } catch (err) {
    logger.error("SESSION", `Failed to clear session: ${err.message}`);
  }
}

async function getInstagramClient() {
  return await tryAllStrategies(loadSession, saveSession);
}

async function exportSession() {
  const { IgApiClient } = require("instagram-private-api");
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;
  if (!username || !password) { console.error("Set IG_USERNAME and IG_PASSWORD first"); process.exit(1); }
  const ig = new IgApiClient();
  ig.state.generateDevice(username);
  await ig.simulate.preLoginFlow();
  const account = await ig.account.login(username, password);
  await ig.simulate.postLoginFlow();
  const serialized = await ig.state.serialize();
  delete serialized.constants;
  const sessionData = { state: serialized, userID: String(account.pk) };
  const b64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");
  console.log("\n✅ Copy this into Replit Secrets as IG_SESSION_STATE:\n");
  console.log(b64);
}

module.exports = { getInstagramClient, saveSession, loadSession, clearSession, exportSession };
