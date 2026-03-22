[![unnamed-3-2.jpg](https://i.postimg.cc/bwBpGb9q/unnamed-3-2.jpg)](https://postimg.cc/mPC0JPnn)

<h1 align="center">🎀 Baka-Chan — Instagram & Messenger Bot</h1>

<p align="center">
  <a href="https://nodejs.org/dist/v20.0.0">
    <img src="https://img.shields.io/badge/Nodejs%20Support-20.x-brightgreen.svg?style=flat-square" alt="Nodejs Support v20.x">
  </a>
  <img alt="size" src="https://img.shields.io/github/repo-size/Gtajisan/Baka-Chan-bot.svg?style=flat-square&label=size">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square&color=brightgreen">
  <img alt="version" src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square">
</p>

---

## 📝 About

**Baka-Chan** is a powerful chatbot that runs on both **Instagram DMs** and **Facebook Messenger**. It features a full command system, event handlers, database support, and an Instagram adapter layer that makes every original command work on Instagram with zero modification.

---

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [Instagram Setup & Login Guide](#instagram-setup--login-guide)
3. [Facebook Messenger Setup](#facebook-messenger-setup)
4. [Configuration Reference](#configuration-reference)
5. [Running the Bot](#running-the-bot)
6. [Project Structure](#project-structure)
7. [Commands](#commands)
8. [Creating New Commands](#creating-new-commands)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## ✅ Requirements

| Requirement          | Version / Notes                                      |
|----------------------|------------------------------------------------------|
| **Node.js**          | v20.x or higher                                      |
| **npm / pnpm**       | npm 8+ or pnpm 8+                                    |
| **Instagram Account**| Dedicated bot account (never use your personal one)  |
| **OS**               | Linux, macOS, Windows (WSL recommended on Windows)   |

---

## 🔐 Instagram Setup & Login Guide

This section walks you through every step to get Baka-Chan connected to Instagram.

---

### Step 1 — Create a Dedicated Instagram Account

> **Important:** Never use your personal Instagram account. Instagram's private API usage can trigger security flags. Create a fresh account specifically for this bot.

1. Open [instagram.com](https://instagram.com) → **Sign Up**
2. Use a unique username (e.g. `mybot_baka` or `bakachan_bot`)
3. Verify the account with a phone number or email
4. (Optional) Enable 2FA — the bot handles 2FA via the `2FA_SECRET` env var

---

### Step 2 — Clone the Repository

```bash
git clone https://github.com/Gtajisan/Baka-chan-bot.git
cd Baka-chan-bot
```

---

### Step 3 — Install Dependencies

```bash
npm install
# or if using pnpm:
pnpm install
```

---

### Step 4 — Set Up Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# ── REQUIRED ──────────────────────────────────────────
IG_USERNAME=your_bot_instagram_username
IG_PASSWORD=your_bot_instagram_password
INSTAGRAM_MODE=true

# ── SESSION SECURITY ──────────────────────────────────
# Generate a strong key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_generated_secret_key

# ── OPTIONAL ──────────────────────────────────────────
ADMIN_ID=your_instagram_numeric_user_id
APP_URL=https://your-deployment-url.replit.app
```

> **How to find your Instagram numeric user ID:**
> Visit `https://www.instagram.com/web/search/topsearch/?context=blended&query=YOUR_USERNAME`
> Look for the `"pk"` field in the response.

---

### Step 5 — Configure `config.json`

Open `config.json` and set at minimum:

```json
{
  "prefix": "!",
  "adminBot": ["YOUR_INSTAGRAM_NUMERIC_USER_ID"],
  "language": "en",
  "instagram": {
    "sessionFile": "session.json",
    "autoReact": true,
    "typingIndicator": true,
    "markAsRead": true,
    "retryAttempts": 5,
    "retryDelay": 1000,
    "mediaDownloadPath": "temp/media"
  }
}
```

---

### Step 6 — First Login

Run the bot. On the very first launch it will:

1. Read `IG_USERNAME` and `IG_PASSWORD` from `.env`
2. Log into Instagram via the private API
3. Save an **AES-256 encrypted session** to `session.json`
4. On every future restart — restore the session from file without re-logging in

```bash
INSTAGRAM_MODE=true node index.js
```

You should see in the console:

```
[SESSION] Logging in to Instagram as @your_username...
[SESSION] Logged in successfully as @your_username (pk: 12345678)
[ADAPTER] Instagram API ready — botID: 12345678
[LOGIN]   ✅ Baka-Chan connected to Instagram
```

---

### Step 7 — Verify the Connection

Send a DM to your bot account from any Instagram account with:

```
!help
```

The bot should reply with the command list.

---

### Session Persistence

After first login, `session.json` is created in the project root:

```
session.json   ← AES-256 encrypted, auto-created on first login
```

- The bot **automatically restores** this session on restart — no re-login needed
- If the session expires or becomes invalid, the bot automatically performs a fresh login
- To force a fresh login: delete `session.json` and restart the bot
- `session.json` is safe to keep in version control (it is encrypted) but ideally add it to `.gitignore`

---

### Two-Factor Authentication (2FA)

If your bot account has 2FA enabled:

```env
IG_2FA_SECRET=your_totp_secret_base32
```

The `SESSION_SECRET` in your `.env` must be set to any strong random string. The bot auto-generates TOTP codes using the secret above.

---

## 💬 Facebook Messenger Setup

To run Baka-Chan in **Facebook Messenger mode** instead:

### Step 1 — Get your Facebook AppState (Cookie)
Use a browser extension (e.g. [c3c-fbstate](https://github.com/c3cbot/c3c-fbstate)) to export your Facebook session cookie as `appstate.json`.

### Step 2 — Place the file
```bash
# Copy your exported appstate to the project root:
cp /path/to/appstate.json ./appstate.json
```

### Step 3 — Configure `config.json`
```json
{
  "facebookAccount": {
    "email": "your_facebook_email",
    "password": "your_facebook_password"
  }
}
```

### Step 4 — Run in Facebook mode
```env
INSTAGRAM_MODE=false
```
```bash
node index.js
```

---

## ⚙️ Configuration Reference

### `config.json` — Full Field Reference

| Field | Type | Description |
|---|---|---|
| `prefix` | string | Command trigger prefix. Default: `!` |
| `adminBot` | array | Array of admin user IDs with full permissions |
| `language` | string | `en` for English, `vi` for Vietnamese |
| `database.type` | string | `sqlite` (recommended), `json`, or `mongodb` |
| `database.uriMongodb` | string | MongoDB connection URI (if using MongoDB) |
| `autoRestart.time` | number/string | Auto-restart interval in ms or cron format |
| `instagram.sessionFile` | string | Path to session file. Default: `session.json` |
| `instagram.autoReact` | boolean | Auto-react to messages |
| `instagram.typingIndicator` | boolean | Show typing before replying |
| `instagram.markAsRead` | boolean | Mark messages as read on receipt |
| `instagram.retryAttempts` | number | Login retry attempts on failure |
| `instagram.retryDelay` | number | Delay (ms) between retry attempts |
| `logEvents.message` | boolean | Log incoming messages to console |
| `optionsFca.selfListen` | boolean | Whether bot reacts to its own messages |
| `whiteListMode.enable` | boolean | Only allow specific users to use the bot |
| `adminOnly.enable` | boolean | Restrict all commands to admins only |

---

### `.env` — Full Variable Reference

| Variable | Required | Description |
|---|---|---|
| `IG_USERNAME` | ✅ Yes | Instagram bot account username |
| `IG_PASSWORD` | ✅ Yes | Instagram bot account password |
| `INSTAGRAM_MODE` | ✅ Yes | `true` for Instagram, `false` for Facebook |
| `SESSION_SECRET` | ✅ Yes | AES-256 key for encrypting session.json |
| `IG_2FA_SECRET` | ⚠️ If 2FA | TOTP base32 secret for 2FA accounts |
| `IG_PROXY` | Optional | Proxy URL: `http://user:pass@host:port` |
| `ADMIN_ID` | Optional | Your numeric Instagram user ID |
| `APP_URL` | Optional | Your deployment URL for self-ping keep-alive |
| `OPENAI_API_KEY` | Optional | For AI-powered commands |
| `GEMINI_API_KEY` | Optional | For Gemini-powered commands |
| `LOG_LEVEL` | Optional | `info`, `warn`, `error`, `debug`. Default: `info` |
| `NODE_ENV` | Optional | `production` or `development` |
| `RATE_LIMIT_MAX` | Optional | Max messages per user per window. Default: 30 |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in ms. Default: 60000 |

---

## ▶️ Running the Bot

### Instagram Mode (recommended)
```bash
INSTAGRAM_MODE=true node index.js
```

### Facebook Messenger Mode
```bash
INSTAGRAM_MODE=false node index.js
```

### Using npm scripts
```bash
npm start       # production mode
npm run dev     # development mode
npm run instagram  # Instagram mode shortcut
```

### Using PM2 (auto-restart on crash)
```bash
npm install -g pm2
pm2 start index.js --name "baka-chan"
pm2 logs baka-chan
pm2 save
pm2 startup
```

### Using Docker
```bash
docker build -t baka-chan .
docker run -d \
  -e IG_USERNAME=your_username \
  -e IG_PASSWORD=your_password \
  -e INSTAGRAM_MODE=true \
  -e SESSION_SECRET=your_secret \
  --name baka-chan \
  baka-chan
```

---

## 📁 Project Structure

```
Baka-chan-bot/
├── index.js                  ← Launcher: keep-alive Express server + auto-restart
├── Goat.js                   ← Facebook Messenger entry point
├── Goat.ig.js                ← Instagram entry point
├── config.json               ← Bot configuration (prefix, admins, db, etc.)
├── configCommands.json       ← Per-command enable/disable toggles
├── .env                      ← Your credentials — NEVER commit this file
├── .env.example              ← Template for .env — safe to commit
├── session.json              ← Encrypted Instagram session (auto-created)
├── index.html                ← Bot status web page
│
├── 📂 scripts/
│   ├── cmds/                 ← All bot commands (one file per command)
│   └── events/               ← All event handlers
│
├── 📂 instagram/             ← Instagram adapter layer
│   ├── adapter.js            ← FCA-compatible API wrapper (core)
│   ├── sessionManager.js     ← Instagram login + AES-256 session handling
│   ├── messageMapper.js      ← Translates Instagram payloads → FCA event format
│   ├── mediaHandler.js       ← Download/upload attachments
│   ├── rateLimiter.js        ← Anti-spam: 30 msg/min per user with backoff
│   └── logger.js             ← Colored structured console + file logger
│
├── 📂 api/                   ← Instagram API interface library
│   ├── index.js              ← Main export: createInstagramAPI()
│   ├── constants.js          ← Event types, reaction map, limits
│   ├── events.js             ← Event object shape documentation
│   ├── methods.js            ← Full JSDoc for every api.* method
│   └── README.md             ← API usage guide
│
├── 📂 bot/
│   ├── login/
│   │   ├── login.js          ← Facebook login flow
│   │   ├── loginInstagram.js ← Instagram login flow + post-login setup
│   │   ├── loadScripts.js    ← Loads commands and events dynamically
│   │   ├── loadData.js       ← Database initialization
│   │   └── handlerWhenListenHasError.js ← Error recovery handler
│   └── handler/
│       ├── handlerEvents.js  ← Dispatches events to scripts/events/
│       ├── handlerAction.js  ← Handles command execution
│       └── handlerCheckData.js ← Data validation for commands
│
├── 📂 database/              ← SQLite / MongoDB / JSON models
├── 📂 logger/                ← Logging utilities (log.js)
├── 📂 languages/             ← i18n translation files (en, vi)
├── 📂 logs/                  ← Log files: logs/sakura.log (auto-created)
├── 📂 temp/media/            ← Temporary downloaded media (auto-created)
├── 📂 fb-chat-api/           ← Local Facebook chat API fork
├── 📂 func/                  ← Internal utility functions
│
├── package.json              ← Dependencies
├── .replit                   ← Replit configuration
├── replit.nix                ← Nix system packages
├── Dockerfile                ← Docker build file
└── README.md                 ← This file
```

---

## 🤖 Commands

Trigger commands by sending a message starting with your prefix (default `!`):

| Command | Role | Description |
|---|---|---|
| `!help` | Everyone | List all available commands |
| `!help [command]` | Everyone | Detailed info about a command |
| `!info` | Everyone | Bot information and version |
| `!uid` | Everyone | Get your Instagram/Facebook user ID |
| `!tid` | Everyone | Get the current thread/conversation ID |
| `!uptime` | Everyone | How long the bot has been running |
| `!prefix` | Everyone | Show current command prefix |
| `!weather [city]` | Everyone | Current weather for any city |
| `!translate [text]` | Everyone | Translate text (auto-detects language) |
| `!ytb [query]` | Everyone | YouTube search |
| `!rank` | Everyone | View your rank and XP |
| `!ban @user` | Admin | Ban a user from using the bot |
| `!unban @user` | Admin | Remove a ban |
| `!admin add @user` | Admin | Grant admin role to a user |
| `!whitelist add [id]` | Admin | Add a user to the whitelist |
| `!restart` | Admin | Restart the bot |
| `!update` | Admin | Pull latest bot updates |

> **Role levels:** `0` = everyone, `1` = group admin, `2` = bot admin

---

## 🔧 Creating New Commands

Create a new `.js` file in `scripts/cmds/`:

```js
// scripts/cmds/hello.js

module.exports = {
  config: {
    name: "hello",
    version: "1.0",
    author: "YourName",
    countDown: 5,           // Cooldown in seconds between uses
    role: 0,               // 0=everyone, 1=group admin, 2=bot admin
    shortDescription: "Say hello",
    longDescription:  "Baka-Chan greets you back with your name",
    category: "fun",
    guide: {
      en: "{pn}"           // {pn} = command name, {p} = prefix
    },
  },

  // Runs when command is triggered
  onStart: async function ({ api, event, args, getText }) {
    const name = args[0] || "friend";
    api.sendMessage(
      `Hello ${name}! I'm Baka-Chan 🎀`,
      event.threadID,
      event.messageID
    );
  },

  // Optional: runs when someone replies to the bot's response
  onReply: async function ({ api, event, Reply }) {
    api.sendMessage("Thanks for the reply!", event.threadID);
  },

  // Optional: runs when someone reacts to the bot's response
  onReaction: async function ({ api, event, Reaction }) {
    api.sendMessage(`You reacted with ${Reaction.reaction}!`, event.threadID);
  },
};
```

### Available parameters in `onStart`:

| Parameter | Description |
|---|---|
| `api` | FCA-compatible API object (same for Instagram and Facebook) |
| `event` | The incoming message event object |
| `args` | Array of words after the command name |
| `message` | Helper: `message.send(text)`, `message.reply(text)` |
| `getText` | i18n helper: `getText("commandName", "key", ...params)` |
| `usersData` | Database: user data access |
| `threadsData` | Database: thread data access |
| `getLang` | Get current language code |

---

## 🔌 Instagram API Reference

The `api/` folder exposes a clean FCA-compatible interface to Instagram. See [`api/README.md`](api/README.md) for the full reference.

```js
const { createInstagramAPI } = require("./api");
const api = await createInstagramAPI();

// Send a message
api.sendMessage("Hello from Baka-Chan! 🎀", threadID);

// Send with attachment
const fs = require("fs");
api.sendMessage(
  { body: "Here's a photo!", attachment: fs.createReadStream("./image.jpg") },
  threadID
);

// Listen to all events
api.listenMqtt((err, event) => {
  if (event.type === "message") { /* incoming DM */ }
  if (event.type === "message_reaction") { /* reaction */ }
  if (event.type === "message_unsend") { /* unsent message */ }
  if (event.type === "typ") { /* typing indicator */ }
});

// Get user info
api.getUserInfo(senderID, (err, info) => {
  console.log(info[senderID].name);
});

// React to a message
api.setMessageReaction("❤️", messageID);
```

---

## 🛡️ Rate Limiting

Baka-Chan automatically protects against Instagram's rate limits:

| Setting | Value |
|---|---|
| Max messages per user | 30 per 60 seconds |
| Backoff on rate limit | 1s → 2s → 4s → 8s → 16s |
| Per-thread tracking | Independent from per-user tracking |
| Counter reset | Every 60 seconds automatically |

When a user hits the limit, they receive a cooldown warning message automatically.

---

## 📊 Health Endpoints

When running, Baka-Chan exposes these HTTP endpoints:

| Endpoint | Method | Response |
|---|---|---|
| `/` | GET | Bot status web page |
| `/status` | GET | `{ status, uptime, restarts, port, mode }` |
| `/health` | GET | `{ ok: true, uptime }` |

Example:
```bash
curl http://localhost:5000/health
# {"ok":true,"uptime":3600}

curl http://localhost:5000/status
# {"status":"running","uptime":3600,"restarts":0,"port":5000,"mode":"instagram"}
```

---

## 🌐 Deployment

### Replit (Recommended — Free)
1. Fork this repo on GitHub, then import it to [Replit](https://replit.com)
2. In **Secrets** (the lock icon), add:
   - `IG_USERNAME` → your bot Instagram username
   - `IG_PASSWORD` → your bot Instagram password
   - `SESSION_SECRET` → a random 32-char string
3. In **Environment Variables**, add:
   - `INSTAGRAM_MODE` → `true`
4. Click **Run** — the bot auto-starts
5. Set `APP_URL` to your Replit app URL for self-ping keep-alive

### Railway
1. Connect GitHub repo to [Railway](https://railway.app)
2. Add environment variables in Railway dashboard
3. Deploy — Railway auto-detects `package.json` and runs `npm start`

### Render
1. Create a **Web Service** on [Render](https://render.com)
2. Connect your repo, set start command: `node index.js`
3. Add all env vars in the Environment tab
4. Set `APP_URL` to your Render service URL

### Koyeb
1. Create an app on [Koyeb](https://www.koyeb.com)
2. Deploy from GitHub with start command: `node index.js`
3. Add env vars in the app settings

### Docker
```bash
# Build
docker build -t baka-chan .

# Run
docker run -d \
  -p 5000:5000 \
  -e IG_USERNAME=your_username \
  -e IG_PASSWORD=your_password \
  -e INSTAGRAM_MODE=true \
  -e SESSION_SECRET=your_secret \
  -v $(pwd)/session.json:/app/session.json \
  --name baka-chan \
  baka-chan

# View logs
docker logs -f baka-chan
```

---

## 🔍 Troubleshooting

### ❌ `IG_USERNAME and IG_PASSWORD must be set in .env`
**Fix:** Make sure your `.env` file exists and contains `IG_USERNAME` and `IG_PASSWORD`.

### ❌ `Session invalid — attempting fresh login`
**Fix:** Your session expired. Delete `session.json` and restart:
```bash
rm session.json && node index.js
```

### ❌ `IgCheckpointError` / Instagram checkpoint required
**Fix:** Instagram triggered a security check on the account.
1. Log into the Instagram account manually in a browser
2. Complete the security verification
3. Delete `session.json` and restart the bot

### ❌ `IgLoginRequiredError`
**Fix:** The account requires a fresh login.
```bash
rm session.json && node index.js
```

### ❌ `IgNetworkError` / Connection issues
**Fix:** Network problems. Try:
- Setting `IG_PROXY` in `.env` if you're in a region with restrictions
- Restarting the bot — it has built-in exponential backoff

### ❌ `Cannot find module 'moment-timezone'`
**Fix:** Dependencies not installed.
```bash
npm install
# or
pnpm install
```

### ❌ Bot connects but commands don't respond
**Fix:** Check the following:
1. You're sending to the correct bot account's DMs
2. Your message starts with the correct prefix (default `!`)
3. Check `configCommands.json` — the command may be disabled

### ❌ `canvas` module error (Facebook mode only)
**Fix:** The `canvas` native module failed to build. This only affects Facebook mode. In Instagram mode (`INSTAGRAM_MODE=true`), canvas is not used.
```bash
npm rebuild canvas
# If that fails, canvas is optional — Instagram mode works without it
```

### 🔎 Checking logs
```bash
# Console output (live)
node index.js

# Log file (rotating daily)
tail -f logs/sakura.log

# PM2 logs
pm2 logs baka-chan
```

---

## 📚 Supported Languages

| Code | Language   |
|------|------------|
| `en` | English    |
| `vi` | Vietnamese |

Change in `config.json`:
```json
{ "language": "en" }
```

---

## 💭 Support

- **Discord**: [Join Server](https://discord.com/invite/DbyGwmkpVY)
- **Facebook Group**: [GoatBot Community](https://www.facebook.com/groups/goatbot)
- **Email**: `ffjisan804@gmail.com`
- **GitHub Issues**: [Report a bug](https://github.com/Gtajisan/baka-chan-bot/issues)

> Do not DM the author for full bot setup support.

---

## ✨ Author

**Gtajisan**
- GitHub: [Gtajisan](https://github.com/Gtajisan)
- Email: `ffjisan804@gmail.com`

---

## 📜 License

MIT License — Do not remove credits. Do not sell or claim as your own.

---

> 🎀 **Baka-Chan Bot v2.0.0 — Instagram Edition** | Made with love by Gtajisan
