"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger.js");

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
  if (!fs.existsSync(SESSION_FILE)) {
    logger.info("SESSION", "No session.json found — fresh login required");
    return null;
  }
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8").trim();
    if (!raw) return null;
    const json = decrypt(raw);
    const data = JSON.parse(json);
    logger.info("SESSION", "Session loaded from session.json");
    return data;
  } catch (err) {
    logger.warn("SESSION", `Could not decrypt session.json (${err.message}) — fresh login required`);
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

async function loginFresh(IgApiClient) {
  const ig = new IgApiClient();
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;

  if (!username || !password) {
    throw new Error("IG_USERNAME and IG_PASSWORD must be set in .env");
  }

  ig.state.generateDevice(username);
  ig.state.proxyUrl = process.env.IG_PROXY || undefined;

  logger.info("SESSION", `Logging in to Instagram as @${username}...`);
  await ig.simulate.preLoginFlow();
  const account = await ig.account.login(username, password);
  await ig.simulate.postLoginFlow();

  const serialized = await ig.state.serialize();
  delete serialized.constants;
  saveSession({ state: serialized, userID: String(account.pk) });
  logger.info("SESSION", `Logged in successfully as @${username} (pk: ${account.pk})`);
  return { ig, userID: String(account.pk) };
}

async function loginWithSession(IgApiClient, sessionData) {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY || undefined;
  await ig.state.deserialize(sessionData.state);
  logger.info("SESSION", "Restored existing Instagram session");
  return { ig, userID: sessionData.userID };
}

async function getInstagramClient() {
  const { IgApiClient } = require("instagram-private-api");
  const existing = loadSession();

  if (existing) {
    try {
      const { ig, userID } = await loginWithSession(IgApiClient, existing);
      await ig.account.currentUser();
      logger.info("SESSION", "Session validated successfully");
      return { ig, userID };
    } catch (err) {
      logger.warn("SESSION", `Session invalid (${err.message}) — attempting fresh login`);
      clearSession();
    }
  }

  const { ig, userID } = await loginFresh(IgApiClient);
  return { ig, userID };
}

module.exports = { getInstagramClient, saveSession, loadSession, clearSession };
