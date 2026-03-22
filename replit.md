# Baka-Chan Bot — Instagram Edition

A production-grade Instagram DM bot built on the GoatBot V2 framework, with a full FCA-compatible adapter layer, encrypted session management, and a Meta-developer-style admin dashboard.

## Project Structure

```
instagram-bot/               ← All bot code lives here
├── index.js                 ← Universal launcher (express server + bot child process)
├── Goat.ig.js               ← Instagram-mode GoatBot V2 entry point
├── Goat.js                  ← Original Facebook-mode entry point (preserved)
├── admin/
│   ├── dashboard.html       ← Meta-developer-style admin console (Pro UI)
│   └── stats.js             ← AdminStats class — live thread/user/message tracking
├── instagram/
│   ├── adapter.js           ← FCA-compatible Instagram API (drop-in for fca-unofficial)
│   ├── loginStrategies.js   ← 6-strategy login waterfall (session → cookies → creds)
│   ├── sessionManager.js    ← AES-256-CBC encrypted session persistence
│   └── messageMapper.js     ← Maps Instagram DM raw events → FCA event format
├── bot/
│   └── login/
│       └── loginInstagram.js ← Instagram login flow (mirrors login.js for GoatBot V2)
├── scripts/
│   ├── exportSession.js     ← LOCAL: log in and export IG_SESSION_STATE base64
│   ├── generateCookies.js   ← Browser cookie export helper
│   └── importCookies.js     ← Cookie import helper
├── .env.example             ← Fully documented env var reference
└── package.json
```

## Architecture

### Instagram Adapter (`instagram/adapter.js`)
A drop-in replacement for `fca-unofficial` (Facebook Chat API). Exposes:
- `sendMessage(msg, threadID)` — sends DM, handles text + attachments
- `listenMqtt(callback)` — polls Instagram inbox at 3s intervals; maps events to FCA format
- `getUserInfo(uid)` — fetches user profile info
- `getThreadInfo(threadID)` — fetches conversation info
- `getThreadList(limit)` — lists recent conversations
- `markAsRead(threadID)` — marks conversation as read
- `sendTypingIndicator(threadID)` — sends typing indicator
- `getCurrentUserID()` — returns bot's Instagram user ID
- `stopListening()` — stops the polling loop
- `refreshFb_dtsg()` — no-op (FCA compat)
- `_loginMethod` — tracks which auth strategy succeeded

### Login Strategies (`instagram/loginStrategies.js`)
Tries in order:
1. `IG_SESSION_STATE` env var (base64 serialized session — **recommended for cloud**)
2. Encrypted `session.json` on disk
3. `ig_cookies.json` browser cookie import
4. `instagram-private-api` direct login
5. `instagram-web-api` fallback
6. Alternative device simulation

### Session Management (`instagram/sessionManager.js`)
- AES-256-CBC encryption with key from `SESSION_SECRET` env var
- Auto-saves session after every successful login

### Stats Tracker (`admin/stats.js`)
`global.adminStats` (AdminStats instance):
- `.threads` — Map of threadID → thread info
- `.users` — Map of userID → user info
- `.messages` / `.messagesToday` — counters
- `.hourlyMessages[24]` — per-hour message counts
- `trackMessage(event)` — called on every inbound message
- `trackBotMessage(threadID)` — called on every bot reply
- `getDashboard()` — summary for `/admin/api/dashboard`

### Admin Dashboard (`admin/dashboard.html`)
Pro Meta-developer-console UI accessible at `/admin`:
- Live metric cards (threads, users, messages, uptime)
- Hourly bar chart (24h activity)
- Recent threads feed
- Users list
- Live log stream
- Stats pages

## Workflows

| Name | Command | Port |
|------|---------|------|
| Instagram Bot | `cd instagram-bot && INSTAGRAM_MODE=true node index.js` | 3000 |

## Environment Variables

Copy `.env.example` to `.env` and fill in. Required for the bot to start:

| Variable | Required | Description |
|----------|----------|-------------|
| `IG_SESSION_STATE` | **OR** | Base64 session (from `node scripts/exportSession.js` locally) |
| `IG_USERNAME` | **OR** | Instagram username |
| `IG_PASSWORD` | **OR** | Instagram password |
| `SESSION_SECRET` | Recommended | AES-256 key for encrypted session storage on disk |
| `ADMIN_ID` | Recommended | Your Instagram numeric user ID (bot admin) |
| `INSTAGRAM_MODE` | Defaults `true` | Set `false` to run in Facebook mode |

## How to Connect Your Instagram Account

### Recommended (cloud-safe): Session Export
1. On your **local machine** (not Replit):
   ```bash
   npm install instagram-private-api dotenv
   node scripts/exportSession.js
   ```
2. Copy the printed base64 string
3. In Replit → Secrets → add `IG_SESSION_STATE` with that value
4. Restart the workflow

### Alternative: Direct Credentials
1. In Replit → Secrets:
   - `IG_USERNAME` = your Instagram handle
   - `IG_PASSWORD` = your password
2. Restart the workflow

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Landing page |
| `GET /health` | Health check `{ok, uptime, mode}` |
| `GET /status` | Status `{status, uptime, restarts, mode}` |
| `GET /admin` | Admin dashboard HTML |
| `GET /admin/api/dashboard` | Summary stats JSON |
| `GET /admin/api/threads` | All threads JSON |
| `GET /admin/api/users` | All users JSON |
| `GET /admin/api/messages` | Message counts JSON |

## Key Design Decisions

- **GoatBot V2 untouched**: All original commands, events, handlers, and database code are preserved. Only the login layer and FCA API object are replaced.
- **FCA compatibility**: The adapter exposes the exact same method signatures that GoatBot V2's handlers expect — no changes to command files required.
- **GBAN skipped**: Instagram user IDs have no overlap with the Facebook GBAN list; the remote fetch is skipped (dataGban = {}).
- **Rate limiting**: 30 msg/min per user and per thread; exponential backoff on 429 errors.
- **No native modules**: `npm install --ignore-scripts` skips `better-sqlite3` native compilation which fails on Replit's NixOS.
