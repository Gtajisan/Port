"use strict";

const logger = require("./logger.js");

const MAX_MESSAGES = parseInt(process.env.RATE_LIMIT_MAX, 10) || 30;
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;

const userCounters = new Map();
const threadCounters = new Map();

function getCounter(map, key) {
  if (!map.has(key)) {
    map.set(key, { count: 0, resetAt: Date.now() + WINDOW_MS });
  }
  const counter = map.get(key);
  if (Date.now() >= counter.resetAt) {
    counter.count = 0;
    counter.resetAt = Date.now() + WINDOW_MS;
  }
  return counter;
}

let backoffDelay = 1000;
const MAX_BACKOFF = 16000;

function resetBackoff() {
  backoffDelay = 1000;
}

async function handleRateLimit429(retryFn) {
  logger.warn("RATE_LIMITER", `Instagram rate limit hit — backing off ${backoffDelay}ms`);
  await new Promise(r => setTimeout(r, backoffDelay));
  backoffDelay = Math.min(backoffDelay * 2, MAX_BACKOFF);
  return retryFn();
}

function isRateLimited(senderID, threadID) {
  const userCounter = getCounter(userCounters, senderID);
  const threadCounter = getCounter(threadCounters, threadID);

  userCounter.count++;
  threadCounter.count++;

  const userLimited = userCounter.count > MAX_MESSAGES;
  const threadLimited = threadCounter.count > MAX_MESSAGES;

  if (userLimited || threadLimited) {
    const msLeft = Math.ceil(((userLimited ? userCounter : threadCounter).resetAt - Date.now()) / 1000);
    logger.warn(
      "RATE_LIMITER",
      `Rate limit hit — senderID:${senderID} threadID:${threadID} — resets in ${msLeft}s`
    );
    return {
      limited: true,
      msLeft,
      warningMessage: `⏳ You are sending messages too fast. Please wait ${msLeft} seconds before trying again.`,
    };
  }

  return { limited: false };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userCounters) {
    if (now >= val.resetAt) userCounters.delete(key);
  }
  for (const [key, val] of threadCounters) {
    if (now >= val.resetAt) threadCounters.delete(key);
  }
}, WINDOW_MS);

module.exports = { isRateLimited, handleRateLimit429, resetBackoff };
