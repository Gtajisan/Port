"use strict";

/**
 * Baka-Chan Instagram API — Event Shape Reference
 *
 * Every event object emitted by listenMqtt() matches this exact shape,
 * identical to FCA so all scripts/events/ handlers work with zero changes.
 */

/**
 * Standard message event — type: "message" | "message_reply"
 * @typedef {Object} MessageEvent
 * @property {string} type           - "message" or "message_reply"
 * @property {string} body           - Message text content
 * @property {string} senderID       - Instagram user ID (string)
 * @property {string} threadID       - Thread/conversation ID (string)
 * @property {string} messageID      - Unique message ID (string)
 * @property {Array}  attachments    - Array of attachment objects
 * @property {number} timestamp      - Unix ms timestamp
 * @property {boolean} isGroup       - true if group thread
 * @property {Object} mentions       - { userID: mentionText }
 * @property {Array}  participantIDs - All thread participant IDs
 */

/**
 * Reaction event — type: "message_reaction"
 * @typedef {Object} ReactionEvent
 * @property {string} type       - "message_reaction"
 * @property {string} threadID
 * @property {string} messageID
 * @property {string} reaction   - Emoji string
 * @property {string} senderID
 * @property {number} timestamp
 */

/**
 * Unsend event — type: "message_unsend"
 * @typedef {Object} UnsendEvent
 * @property {string} type       - "message_unsend"
 * @property {string} threadID
 * @property {string} messageID
 * @property {string} senderID
 * @property {number} timestamp
 */

/**
 * Typing indicator — type: "typ"
 * @typedef {Object} TypingEvent
 * @property {string}  type      - "typ"
 * @property {string}  threadID
 * @property {string}  from      - User ID who is typing
 * @property {boolean} isTyping
 */

/**
 * Thread event — type: "event"
 * @typedef {Object} ThreadEvent
 * @property {string} type       - "event"
 * @property {string} logMessageType  - e.g. "log:subscribe", "log:unsubscribe"
 * @property {string} threadID
 * @property {Array}  logMessageData
 * @property {string} author
 * @property {number} timestamp
 */

/**
 * Attachment object shape
 * @typedef {Object} Attachment
 * @property {string} type       - "photo" | "video" | "audio" | "sticker" | "file"
 * @property {string} url        - Direct download URL
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [duration] - For audio/video, milliseconds
 * @property {string} [filename]
 */

/**
 * UserInfo object shape (returned by getUserInfo)
 * @typedef {Object} UserInfo
 * @property {string} name
 * @property {string} firstName
 * @property {string} vanity       - Instagram username
 * @property {string} profileUrl
 * @property {string} thumbSrc     - Profile picture URL
 * @property {string} type         - "user"
 * @property {boolean} isFriend
 * @property {boolean} isBirthday
 */

/**
 * ThreadInfo object shape (returned by getThreadInfo)
 * @typedef {Object} ThreadInfo
 * @property {string}  threadID
 * @property {string}  name          - Thread/group name
 * @property {string}  imageSrc      - Thread image URL
 * @property {Array}   participantIDs
 * @property {Array}   userInfo      - Array of UserInfo
 * @property {boolean} isGroup
 * @property {number}  messageCount
 */

module.exports = {
  MessageEvent: {},
  ReactionEvent: {},
  UnsendEvent: {},
  TypingEvent: {},
  ThreadEvent: {},
};
