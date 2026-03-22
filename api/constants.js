"use strict";

/**
 * Baka-Chan Instagram API — Constants
 * Mirrors FCA constant names so commands referencing them need zero changes.
 */

module.exports = {

  // ── Message types ──────────────────────────────────────────────────────────
  MESSAGE_TYPES: {
    MESSAGE:          "message",
    MESSAGE_REPLY:    "message_reply",
    MESSAGE_REACTION: "message_reaction",
    MESSAGE_UNSEND:   "message_unsend",
    EVENT:            "event",
    READ_RECEIPT:     "read_receipt",
    TYPING:           "typ",
    PRESENCE:         "presence",
  },

  // ── Event sub-types ────────────────────────────────────────────────────────
  EVENT_TYPES: {
    ADD_PARTICIPANTS:    "add_participants",
    REMOVE_PARTICIPANTS: "remove_participants",
    CHANGE_THREAD_NAME:  "change_thread_name",
    CHANGE_THREAD_IMAGE: "change_thread_image",
    CHANGE_THREAD_EMOJI: "change_thread_emoji",
    CHANGE_NICKNAME:     "change_nickname",
    CHANGE_THREAD_COLOR: "change_thread_color",
    CALL_LOG:            "call_log",
  },

  // ── Reaction emoji map ─────────────────────────────────────────────────────
  REACTIONS: {
    LIKE:    "❤️",
    HAHA:    "😂",
    WOW:     "😮",
    SAD:     "😢",
    ANGRY:   "😠",
    DISLIKE: "👎",
    LOVE:    "😍",
    FIRE:    "🔥",
  },

  // ── Attachment types ───────────────────────────────────────────────────────
  ATTACHMENT_TYPES: {
    PHOTO:   "photo",
    VIDEO:   "video",
    AUDIO:   "audio",
    FILE:    "file",
    STICKER: "sticker",
    SHARE:   "share",
    STORY_MENTION: "story_mention",
  },

  // ── API limits ─────────────────────────────────────────────────────────────
  LIMITS: {
    RATE_LIMIT_MAX:    30,
    RATE_LIMIT_WINDOW: 60000,
    MAX_MESSAGE_LEN:   1000,
    MAX_ATTACHMENTS:   10,
    POLL_INTERVAL_MS:  3000,
    SESSION_TTL_MS:    86400000,
  },

};
