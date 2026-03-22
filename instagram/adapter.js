"use strict";

/**
 * Instagram Adapter — Drop-in FCA api replacement
 * Returns an api object with identical interface to fca-unofficial
 * so zero commands or events need modification.
 */

require("dotenv").config();

const logger = require("./logger.js");
const { getInstagramClient, saveSession, clearSession } = require("./sessionManager.js");
const { mapDirectMessage, mapThreadInfo, mapUserInfo } = require("./messageMapper.js");
const { isRateLimited, handleRateLimit429 } = require("./rateLimiter.js");
const mediaHandler = require("./mediaHandler.js");
const NodeCache = require("node-cache");

const userInfoCache = new NodeCache({ stdTTL: 600 });
const threadInfoCache = new NodeCache({ stdTTL: 300 });

// Exponential back-off helper
async function withRetry(fn, retries = 3, label = "IG_API") {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status || err?.status;
      if (status === 429) {
        await handleRateLimit429(() => {});
        continue;
      }
      if (status === 401 || status === 403) {
        logger.error(label, `Auth error (${status}) — session may be invalid`);
        throw err;
      }
      const delay = 1000 * (i + 1);
      logger.warn(label, `Retry ${i + 1}/${retries} in ${delay}ms: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

module.exports.createInstagramAPI = async function () {
  const { ig, userID, method: loginMethod } = await getInstagramClient();
  logger.info("ADAPTER", `Instagram API ready — botID: ${userID} (auth: ${loginMethod || "unknown"})`);

  // Polling state — shared so stopListening can clear it
  let pollIntervalID = null;
  let seenItemIDs = new Set();
  let listeningActive = false;

  // ─── Build the FCA-compatible api object ─────────────────────────────────
  const api = {

    // ── Core messaging ───────────────────────────────────────────────────────

    sendMessage: async function (msg, threadID, callback) {
      try {
        const tid = String(threadID);
        const thread = ig.entity.directThread([tid]);
        let lastResult;

        if (typeof msg === "string") {
          lastResult = await withRetry(() => thread.broadcastText(msg));
        } else if (msg && typeof msg === "object") {
          if (msg.body && typeof msg.body === "string" && msg.body.trim()) {
            lastResult = await withRetry(() => thread.broadcastText(msg.body));
          }
          if (msg.attachment) {
            const attachments = Array.isArray(msg.attachment) ? msg.attachment : [msg.attachment];
            for (const att of attachments) {
              try {
                let buf;
                if (att.stream) {
                  const chunks = [];
                  await new Promise((res, rej) => {
                    att.stream.on("data", c => chunks.push(c));
                    att.stream.on("end", res);
                    att.stream.on("error", rej);
                  });
                  buf = Buffer.concat(chunks);
                } else if (att.url) {
                  buf = await mediaHandler.getMediaBuffer(att.url);
                } else {
                  continue;
                }
                const mime = att.type || "image/jpeg";
                if (mime.startsWith("image/")) {
                  const optimized = await mediaHandler.optimizeImage(buf, { maxWidth: 1920 });
                  await withRetry(() =>
                    ig.publish.photo({ file: optimized })
                  );
                } else {
                  await withRetry(() => thread.broadcastText("[Attachment — unsupported for Instagram DM]"));
                }
              } catch (attErr) {
                logger.error("ADAPTER", `Attachment error: ${attErr.message}`);
              }
            }
          }
        }

        const msgInfo = {
          threadID: tid,
          messageID: lastResult?.payload?.item_id || String(Date.now()),
          timestamp: Date.now(),
          sourceBot: "instagram",
          sourceType: "bot",
          source: "instagram",
          isBot: true,
        };
        logger.info("ADAPTER", `sendMessage → threadID:${tid}`);
        if (typeof callback === "function") callback(null, msgInfo);
        return msgInfo;
      } catch (err) {
        logger.error("ADAPTER", `sendMessage failed: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    sendTypingIndicator: function (threadID, callback) {
      const thread = ig.entity.directThread([String(threadID)]);
      withRetry(() => thread.indicate())
        .then(() => { if (typeof callback === "function") callback(null, () => {}); })
        .catch(err => {
          logger.warn("ADAPTER", `sendTypingIndicator error: ${err.message}`);
          if (typeof callback === "function") callback(err);
        });
      return function stopTyping() {};
    },

    markAsRead: async function (threadID, callback) {
      try {
        const inbox = await withRetry(() => ig.feed.directInbox().request());
        const thread = (inbox?.inbox?.threads || []).find(t => t.thread_id === String(threadID));
        if (thread?.items?.length) {
          await withRetry(() =>
            ig.directThread.markItemSeen(String(threadID), thread.items[0].item_id)
          );
        }
        if (typeof callback === "function") callback(null);
      } catch (err) {
        logger.warn("ADAPTER", `markAsRead error: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    unsendMessage: async function (messageID, callback) {
      // Instagram Private API does not support unsend via this method
      logger.warn("ADAPTER", `unsendMessage not supported on Instagram (messageID: ${messageID})`);
      if (typeof callback === "function") callback(null);
    },

    // ── User & thread info ───────────────────────────────────────────────────

    getUserInfo: async function (ids, callback) {
      try {
        const idList = Array.isArray(ids) ? ids : [ids];
        const result = {};
        for (const id of idList) {
          const key = `user_${id}`;
          const cached = userInfoCache.get(key);
          if (cached) { Object.assign(result, cached); continue; }
          try {
            const raw = await withRetry(() => ig.user.info(String(id)));
            const mapped = mapUserInfo(raw);
            Object.assign(result, mapped);
            userInfoCache.set(key, mapped);
          } catch (e) {
            logger.warn("ADAPTER", `getUserInfo failed for id=${id}: ${e.message}`);
            result[String(id)] = { name: `User ${id}`, type: "user" };
          }
        }
        if (typeof callback === "function") callback(null, result);
        return result;
      } catch (err) {
        logger.error("ADAPTER", `getUserInfo failed: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    getThreadInfo: async function (threadID, callback) {
      try {
        const key = `thread_${threadID}`;
        const cached = threadInfoCache.get(key);
        if (cached) {
          if (typeof callback === "function") callback(null, cached);
          return cached;
        }
        const raw = await withRetry(() => ig.directThread.info(String(threadID)));
        const mapped = mapThreadInfo(raw.thread || raw);
        threadInfoCache.set(key, mapped);
        if (typeof callback === "function") callback(null, mapped);
        return mapped;
      } catch (err) {
        logger.error("ADAPTER", `getThreadInfo failed for ${threadID}: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    // FCA signature: getThreadList(limit, timestamp, tags, callback)
    // tags = ["INBOX"] etc. We ignore tags for Instagram.
    getThreadList: async function (limit, timestamp, tagsOrCallback, callback) {
      const cb = typeof tagsOrCallback === "function" ? tagsOrCallback : callback;
      try {
        const feed = ig.feed.directInbox();
        const threads = await withRetry(() => feed.items());
        const mapped = threads.slice(0, limit || 20).map(t => mapThreadInfo(t));
        if (typeof cb === "function") cb(null, mapped);
        return mapped;
      } catch (err) {
        logger.error("ADAPTER", `getThreadList failed: ${err.message}`);
        if (typeof cb === "function") cb(err);
        throw err;
      }
    },

    getMessageList: async function (threadID, limit, timestamp, callback) {
      try {
        const tid = String(threadID);
        const thread = ig.entity.directThread([tid]);
        const messages = await withRetry(() => thread.messages.request({ amount: limit || 20 }));
        const mapped = (messages.items || []).map((item, idx) => 
          mapDirectMessage(
            { ...item, thread_type: "group" },
            threadID,
            userID
          )
        ).reverse(); // Chronological order
        if (typeof callback === "function") callback(null, mapped);
        return mapped;
      } catch (err) {
        logger.error("ADAPTER", `getMessageList failed for ${threadID}: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    // ── Group Chat Management ────────────────────────────────────────────────────

    addUserToGroup: async function (userID, threadID, callback) {
      try {
        const tid = String(threadID);
        const uid = String(userID);
        const thread = ig.entity.directThread([tid]);
        // Instagram private API may not expose direct add_user, so log for now
        logger.info("ADAPTER", `addUserToGroup: userID=${uid} threadID=${tid} (limited support)`);
        // Instagram groups manage members differently - this is a placeholder
        if (typeof callback === "function") callback(null);
        return true;
      } catch (err) {
        logger.warn("ADAPTER", `addUserToGroup not fully supported: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    removeUserFromGroup: async function (userID, threadID, callback) {
      try {
        const tid = String(threadID);
        const uid = String(userID);
        logger.info("ADAPTER", `removeUserFromGroup: userID=${uid} threadID=${tid} (limited support)`);
        if (typeof callback === "function") callback(null);
        return true;
      } catch (err) {
        logger.warn("ADAPTER", `removeUserFromGroup not fully supported: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    changeGroupImage: async function (threadID, imagePath, callback) {
      try {
        logger.info("ADAPTER", `changeGroupImage: threadID=${threadID} (not supported on Instagram DM)`);
        if (typeof callback === "function") callback(null);
      } catch (err) {
        logger.warn("ADAPTER", `changeGroupImage: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    changeGroupTitle: async function (title, threadID, callback) {
      try {
        logger.info("ADAPTER", `changeGroupTitle: "${title}" threadID=${threadID} (limited support)`);
        if (typeof callback === "function") callback(null);
      } catch (err) {
        logger.warn("ADAPTER", `changeGroupTitle: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    // ── Reactions ────────────────────────────────────────────────────────────

    setMessageReaction: async function (reaction, messageID, callback) {
      try {
        // Instagram DM reaction support is limited in the private API
        logger.info("ADAPTER", `setMessageReaction reaction:${reaction} messageID:${messageID}`);
        if (typeof callback === "function") callback(null);
      } catch (err) {
        logger.error("ADAPTER", `setMessageReaction failed: ${err.message}`);
        if (typeof callback === "function") callback(err);
      }
    },

    // ── Listener ─────────────────────────────────────────────────────────────

    listenMqtt: function (callback) {
      if (listeningActive) {
        logger.warn("ADAPTER", "listenMqtt called while already active — ignoring");
        return;
      }
      listeningActive = true;
      logger.info("ADAPTER", "Starting Instagram inbox poller (3s interval)...");

      async function pollInbox() {
        try {
          const feed = ig.feed.directInbox();
          const threads = await feed.items();

          for (const thread of threads) {
            const threadID = thread.thread_id;
            const items = thread.items || [];

            for (const item of items) {
              const itemID = item.item_id;
              if (seenItemIDs.has(itemID)) continue;
              seenItemIDs.add(itemID);

              // Skip own messages
              if (String(item.user_id) === String(userID)) continue;

              const event = mapDirectMessage(
                { ...item, thread_type: thread.is_group ? "group" : "private", participants: thread.users || [] },
                threadID,
                userID
              );

              // Rate limiting
              const rateCheck = isRateLimited(event.senderID, event.threadID);
              if (rateCheck.limited) {
                logger.warn("ADAPTER", `Rate limited senderID=${event.senderID}`);
                try {
                  const t = ig.entity.directThread([String(event.threadID)]);
                  await t.broadcastText(rateCheck.warningMessage);
                } catch (_) {}
                continue;
              }

              logger.dm("POLLER", `type=${event.type} from=${event.senderID} thread=${threadID}`);

              if (typeof callback === "function") {
                try {
                  callback(null, event);
                } catch (handlerErr) {
                  logger.error("POLLER", `Handler threw: ${handlerErr.message}`);
                }
              }
            }
          }

          // Keep seen set bounded
          if (seenItemIDs.size > 5000) {
            const arr = Array.from(seenItemIDs);
            seenItemIDs = new Set(arr.slice(arr.length - 2500));
          }
        } catch (err) {
          logger.error("POLLER", `Poll error: ${err.message}`);
          if (err?.response?.status === 401) {
            logger.warn("POLLER", "Session expired — clearing session and exiting");
            clearSession();
            if (typeof callback === "function") callback({ error: "Not logged in", message: err.message });
            return;
          }
        }
      }

      // First poll immediately, then interval
      pollInbox().catch(err => logger.error("POLLER", `Initial poll error: ${err.message}`));
      pollIntervalID = setInterval(() => {
        pollInbox().catch(err => logger.error("POLLER", `Interval poll error: ${err.message}`));
      }, 3000);

      return pollIntervalID;
    },

    stopListening: function (callback) {
      if (pollIntervalID) {
        clearInterval(pollIntervalID);
        pollIntervalID = null;
      }
      listeningActive = false;
      logger.info("ADAPTER", "Listener stopped");
      if (typeof callback === "function") callback();
    },

    // ── Bot info ─────────────────────────────────────────────────────────────

    getCurrentUserID: function () {
      return String(userID);
    },

    getSelfInfo: async function (callback) {
      try {
        const user = await withRetry(() => ig.account.currentUser());
        const result = {
          id: String(user.pk),
          name: user.full_name || user.username,
          firstName: (user.full_name || "").split(" ")[0] || user.username,
          vanity: user.username,
          profilePic: user.profile_pic_url || "",
          gender: 0,
          type: "user",
          sourceType: "user",
          source: "instagram",
          isBot: false,
        };
        if (typeof callback === "function") callback(null, result);
        return result;
      } catch (err) {
        logger.error("ADAPTER", `getSelfInfo failed: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    getFriendsList: async function (callback) {
      try {
        const feed = ig.feed.accountFollowing();
        const users = await withRetry(() => feed.items());
        const result = {};
        for (const u of users) {
          const uid = String(u.pk);
          result[uid] = {
            alternateName: u.full_name || u.username,
            gender: 0,
            isFriend: true,
            isBirthday: false,
            vanity: u.username,
            isMobile: true,
            profilePic: u.profile_pic_url || "",
            type: "friend",
            profileUrl: `https://www.instagram.com/${u.username}/`,
            name: u.full_name || u.username,
            firstName: (u.full_name || "").split(" ")[0] || u.username,
            thumbSrc: u.profile_pic_url || "",
            id: uid,
          };
        }
        if (typeof callback === "function") callback(null, result);
        return result;
      } catch (err) {
        logger.error("ADAPTER", `getFriendsList failed: ${err.message}`);
        if (typeof callback === "function") callback(err);
        throw err;
      }
    },

    // ── FCA stubs (no-ops to keep stock files working) ───────────────────────

    /**
     * FCA setOptions — no-op on Instagram.
     * Called by loadData.js during autoSyncWhenStart.
     */
    setOptions: function (options, callback) {
      logger.debug("ADAPTER", `setOptions called (no-op on Instagram): ${JSON.stringify(options)}`);
      if (typeof callback === "function") callback(null);
    },

    /**
     * FCA getAppState — not applicable on Instagram.
     * Called by login.js autoRefreshFbstate block (not used in loginInstagram.js).
     */
    getAppState: function () {
      logger.debug("ADAPTER", "getAppState called (no-op on Instagram) — returning []");
      return [];
    },

    /**
     * FCA refreshFb_dtsg — called by bot/custom.js every 48h.
     * No equivalent on Instagram — stub returns resolved promise.
     */
    refreshFb_dtsg: function () {
      logger.debug("ADAPTER", "refreshFb_dtsg called (no-op on Instagram)");
      return Promise.resolve();
    },

    // ── Internal references ───────────────────────────────────────────────────
    _ig: ig,
    _userID: String(userID),
    _loginMethod: loginMethod || "instagram-private-api",
  };

  return api;
};
