"use strict";

/**
 * Baka-Chan Instagram API — Method Reference
 *
 * Documents every method on the api object returned by createInstagramAPI().
 * All signatures are 100% identical to fca-unofficial.
 */

/**
 * api.sendMessage(message, threadID, [callback])
 *
 * Send a message to a thread.
 *
 * @param {string|Object} message
 *   String for plain text.
 *   Object for rich messages:
 *     { body: "text", attachment: ReadableStream|Array<ReadableStream> }
 *     { body: "text", sticker: "stickerID" }
 *     { body: "text", url: "https://..." }   — link share
 * @param {string} threadID
 * @param {Function} [callback]  (err, messageInfo) => {}
 *
 * @example
 *   api.sendMessage("Hello!", event.threadID, (err, info) => {
 *     console.log("Sent:", info.messageID);
 *   });
 */

/**
 * api.sendTypingIndicator(threadID, [callback])
 *
 * Show typing indicator in thread for ~3 seconds.
 *
 * @param {string} threadID
 * @param {Function} [callback]  (err) => {}
 */

/**
 * api.markAsRead(threadID, [callback])
 *
 * Mark all messages in thread as read.
 *
 * @param {string} threadID
 * @param {Function} [callback]  (err) => {}
 */

/**
 * api.unsendMessage(messageID, [callback])
 *
 * Delete (unsend) a sent message by ID.
 *
 * @param {string} messageID
 * @param {Function} [callback]  (err) => {}
 */

/**
 * api.getUserInfo(id, callback)
 *
 * Get user profile information.
 *
 * @param {string|Array<string>} id  - User ID or array of IDs
 * @param {Function} callback  (err, info) => {}
 *   info: { [userID]: UserInfo }
 */

/**
 * api.getThreadInfo(threadID, callback)
 *
 * Get thread metadata (name, participants, etc.).
 *
 * @param {string} threadID
 * @param {Function} callback  (err, info) => {}
 *   info: ThreadInfo
 */

/**
 * api.getThreadList(limit, timestamp, callback)
 *
 * Get a list of threads.
 *
 * @param {number}   limit      - Max threads to return
 * @param {number|null} timestamp  - Cursor for pagination, null for latest
 * @param {Function} callback   (err, list) => {}
 */

/**
 * api.setMessageReaction(reaction, messageID, [callback])
 *
 * React to a message with an emoji.
 *
 * @param {string} reaction   - Emoji string e.g. "❤️", "😂"
 * @param {string} messageID
 * @param {Function} [callback]  (err) => {}
 */

/**
 * api.listenMqtt(callback)
 *
 * Start the real-time event listener.
 * Returns a stopListening function.
 *
 * @param {Function} callback  (err, event) => {}
 *   event: MessageEvent | ReactionEvent | UnsendEvent | TypingEvent | ThreadEvent
 * @returns {Function} stopListening — call to stop the listener
 *
 * @example
 *   const stopListening = api.listenMqtt((err, event) => {
 *     if (err) return console.error(err);
 *     if (event.type === "message") {
 *       api.sendMessage("Got it!", event.threadID);
 *     }
 *   });
 */

/**
 * api.getCurrentUserID()
 *
 * Returns the bot's own Instagram user ID as a string.
 *
 * @returns {string} userID
 */

/**
 * api.getFriendsList(callback)
 *
 * Get the bot account's followers/following list.
 *
 * @param {Function} callback  (err, list) => {}
 */

module.exports = {};
