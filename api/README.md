# Baka-Chan Bot — Instagram API Library

The `api/` folder is the clean interface layer between Baka-Chan's command/event system and Instagram's private API. It wraps `instagram/adapter.js` and exposes a 100% FCA-compatible object so every command in `scripts/cmds/` and every event in `scripts/events/` works without a single line change.

---

## How It Works

```
Instagram DM ──► instagram-private-api
                        │
                instagram/adapter.js    ← translates Instagram → FCA shape
                        │
                   api/index.js         ← clean export point
                        │
              bot/login/loginInstagram.js
                        │
        scripts/cmds/   +   scripts/events/   ← zero changes needed
```

---

## Quick Start

```js
const { createInstagramAPI } = require("./api");

(async () => {
  const api = await createInstagramAPI();

  // Send a message
  api.sendMessage("Hello from Baka-Chan! 🎀", "threadID_here");

  // Listen for incoming DMs
  api.listenMqtt((err, event) => {
    if (err) return console.error(err);
    if (event.type === "message") {
      console.log(`[${event.threadID}] ${event.body}`);
      api.sendMessage("Got your message!", event.threadID);
    }
  });
})();
```

---

## API Reference

### `createInstagramAPI()`

Returns a Promise that resolves to an FCA-compatible `api` object.

```js
const { createInstagramAPI } = require("./api");
const api = await createInstagramAPI();
```

---

### Messaging

#### `api.sendMessage(message, threadID, [callback])`

| Parameter  | Type             | Description                      |
|------------|------------------|----------------------------------|
| `message`  | string or Object | Text string, or rich message obj |
| `threadID` | string           | Instagram thread ID               |
| `callback` | function         | `(err, messageInfo) => {}`       |

Rich message object formats:
```js
// Plain text
api.sendMessage("Hello!", threadID);

// With image attachment
api.sendMessage({ body: "Check this!", attachment: fs.createReadStream("img.jpg") }, threadID);

// Multiple attachments
api.sendMessage({ attachment: [stream1, stream2] }, threadID);
```

#### `api.sendTypingIndicator(threadID, [callback])`
Shows a typing indicator for ~3 seconds.

#### `api.markAsRead(threadID, [callback])`
Marks all messages in the thread as read.

#### `api.unsendMessage(messageID, [callback])`
Deletes a previously sent message.

---

### User & Thread Info

#### `api.getUserInfo(id, callback)`
```js
api.getUserInfo(event.senderID, (err, info) => {
  console.log(info[event.senderID].name);
});
```

#### `api.getThreadInfo(threadID, callback)`
```js
api.getThreadInfo(event.threadID, (err, info) => {
  console.log(info.name, info.participantIDs);
});
```

#### `api.getThreadList(limit, timestamp, callback)`
```js
api.getThreadList(10, null, (err, list) => {
  list.forEach(t => console.log(t.threadID, t.name));
});
```

---

### Reactions

#### `api.setMessageReaction(reaction, messageID, [callback])`
```js
api.setMessageReaction("❤️", event.messageID);
```

---

### Listener

#### `api.listenMqtt(callback)` → `stopListening`
```js
const stopListening = api.listenMqtt((err, event) => {
  if (event.type === "message") { /* handle */ }
  if (event.type === "message_reaction") { /* handle */ }
  if (event.type === "message_unsend") { /* handle */ }
  if (event.type === "typ") { /* handle typing */ }
  if (event.type === "event") { /* handle thread events */ }
});

// To stop:
stopListening();
```

---

### Bot Info

#### `api.getCurrentUserID()` → `string`
Returns the bot's own Instagram numeric user ID.

#### `api.getFriendsList(callback)`
Returns the account's follower/following list.

---

## Event Object Shape

Every event passed to `listenMqtt` callback:

```js
{
  type:           "message",        // message | message_reply | message_reaction | message_unsend | typ | event
  body:           "Hello!",         // Message text
  senderID:       "12345678",       // Instagram user ID (string)
  threadID:       "12345678",       // Thread ID (string)
  messageID:      "mid.$abc123",    // Message ID (string)
  attachments:    [],               // Array of attachment objects
  timestamp:      1710000000000,    // Unix ms
  isGroup:        false,            // Boolean
  mentions:       {},               // { userID: "@mention" }
  participantIDs: ["123", "456"],   // Thread participants
}
```

---

## Files in This Folder

| File           | Description                                           |
|----------------|-------------------------------------------------------|
| `index.js`     | Main entry — exports `createInstagramAPI`             |
| `constants.js` | Event types, reaction map, attachment types, limits   |
| `events.js`    | TypeDef docs for all event object shapes              |
| `methods.js`   | Full JSDoc for every `api.*` method                   |
| `README.md`    | This file — complete API usage guide                  |

---

## Environment Variables Required

| Variable          | Description                            |
|-------------------|----------------------------------------|
| `IG_USERNAME`     | Instagram account username             |
| `IG_PASSWORD`     | Instagram account password             |
| `SESSION_SECRET`  | AES-256 key for encrypting session.json|
| `INSTAGRAM_MODE`  | Set to `true` to activate Instagram    |

See `.env.example` for the full list.

---

## Notes

- Session is saved encrypted to `session.json` after first login — bot restores it on restart without re-logging in.
- Rate limiter caps at 30 messages per user per 60 seconds automatically.
- All logs go to `logs/sakura.log` with daily rotation.
- The adapter is a **poll-based** listener checking Instagram inbox every 3 seconds.
