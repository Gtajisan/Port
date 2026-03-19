# Baka-Chan Bot

## Overview
Baka-Chan Bot is a modernized Facebook Messenger bot built with the ws3-fca library. This project has been rebranded from Goat Bot and now features a clean, modern architecture with updated dependencies.

**Current Version:** 2.0.0  
**Maintained by:** Gtajisan (ffjisan804@gmail.com)  
**GitHub:** https://github.com/Gtajisan/baka-chan-bot

## Recent Changes (October 11, 2025)

### Major Updates
1. **FCA Library Replacement** - Replaced old nexus-fca with ws3-fca (https://github.com/tas33n/ws3-fca)
2. **Complete Rebranding** - Changed from Goat Bot to Baka-Chan Bot throughout the codebase
3. **Dependency Cleanup** - Removed Google APIs, verification system, and dashboard features
4. **Fixed Console Errors** - Resolved LSP errors and updated deprecated syntax
5. **Modernized Structure** - Updated project configuration and removed unused features

### Removed Features
- Google Drive API integration
- Gmail/Email functionality
- Dashboard UI (removed entire dashboard directory)
- User verification system
- Google reCAPTCHA

### Architecture Changes
- **FCA Integration:** Bot now uses ws3-fca located in `fb-chat-api/` directory
- **Simplified Config:** Removed Google credentials and dashboard settings from config.json
- **Cleaner Dependencies:** Removed googleapis, nodemailer, and dashboard-related packages

## Project Structure

```
baka-chan-bot/
├── bot/                    # Bot core logic
│   ├── handler/           # Event and action handlers
│   └── login/             # Login and authentication
├── fb-chat-api/           # ws3-fca library
├── assets/                # Bot assets and media
├── database/              # Database schemas
├── languages/             # Localization files
├── scripts/               # Utility scripts
├── logger/                # Logging utilities
├── Goat.js               # Main bot file
├── index.js              # Entry point with auto-restart
├── config.json           # Bot configuration
└── package.json          # Dependencies
```

## Setup & Configuration

### Prerequisites
- Node.js >= 18.x
- npm >= 8.0.0

### Installation
```bash
npm install
```

### Configuration Files
1. **config.json** - Main bot configuration
   - **IMPORTANT:** Add your Facebook account email/password (never commit credentials to Git)
   - Configure bot prefix and nickname
   - Set admin IDs  
   - Database settings (SQLite/MongoDB)

2. **account.txt** - Facebook cookies/credentials (auto-populated)

### Security Notes
⚠️ **NEVER commit real Facebook credentials to the repository!**
- Keep config.json in .gitignore
- Use environment variables for production
- Change default credentials before first use

### Running the Bot
```bash
npm start       # Production mode
npm run dev     # Development mode
```

## Facebook Login

The bot supports multiple login methods:
1. Email/Password with 2FA
2. Facebook Token
3. Cookie String
4. Cookie Array

Note: Facebook may block login from unknown locations. If you encounter login errors, try logging in from a browser first to verify your account.

## User Preferences

### Coding Style
- Standard JavaScript with Node.js best practices
- Async/await for asynchronous operations
- Modular structure with clear separation of concerns

### Bot Configuration
- **Prefix:** `!` (configurable in config.json)
- **Database:** SQLite (can be changed to MongoDB)
- **Timezone:** Asia/Ho_Chi_Minh (configurable)

## Instagram Mode (New)

Baka-Chan Bot now supports running on Instagram DM via a zero-modification adapter layer.

### How it works
- `instagram/adapter.js` — FCA-interface-compatible api object using `instagram-private-api`
- `instagram/sessionManager.js` — AES-256 encrypted session persistence (session.json)
- `instagram/messageMapper.js` — Instagram DM items → FCA-compatible event objects
- `instagram/rateLimiter.js` — 30 messages/60s per user/thread with exponential backoff
- `instagram/mediaHandler.js` — Image optimization (sharp), buffer download/upload
- `instagram/logger.js` — chalk + winston + daily-rotate-file logging
- `bot/login/loginInstagram.js` — Instagram login bridge (replaces login.js logic)
- `Goat.ig.js` — Instagram-mode entry point (twin of Goat.js)

### Switching to Instagram Mode
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Fill in your Instagram credentials
# Edit .env:  IG_USERNAME, IG_PASSWORD, INSTAGRAM_MODE=true

# 3. Start the bot — index.js detects INSTAGRAM_MODE=true and spawns Goat.ig.js
npm start
```

### API Compatibility
The `api` object returned by `createInstagramAPI()` is 100% interface-compatible with FCA:
- `sendMessage`, `sendTypingIndicator`, `markAsRead`, `unsendMessage`
- `getUserInfo`, `getThreadInfo`, `getThreadList`
- `setMessageReaction`, `listenMqtt`, `stopListening`
- `getCurrentUserID`, `getFriendsList`
- FCA stubs (no-ops): `setOptions`, `getAppState`, `refreshFb_dtsg`

All existing commands (`scripts/cmds/`) and events (`scripts/events/`) work unchanged.

## Known Issues

1. **Facebook Login Required (FB mode):** You MUST provide valid Facebook credentials in config.json before the bot can run in FB mode.
2. **Facebook Login Restrictions:** The bot may encounter login issues due to Facebook's security measures. If login fails, try logging into Facebook from a browser first.
3. **Google Drive Features Removed:** Commands using Google Drive will fail gracefully with an error message.
4. **Email Features Removed:** Mail functionality has been disabled.
5. **Instagram Polling:** Instagram mode uses polling every 3s (no true websocket). This is the limitation of the private API.

## Development Notes

### Dependencies
- Core: axios, express, fs-extra
- Bot: ws3-fca (Facebook Chat API), instagram-private-api (Instagram)
- Database: mongoose, sequelize, sqlite3
- Instagram Adapter: dotenv, chalk@4, winston, winston-daily-rotate-file, node-cache, sharp
- Utilities: canvas, cheerio, moment-timezone, node-cron

### Environment
- Runs on Replit with Node.js 20.x+
- Auto-restart on crash (index.js launcher)
- Keep-alive HTTP server on port 5000 (GET /status and GET /health)
- INSTAGRAM_MODE env var switches spawned entry point

## Support & Contact

- **GitHub Issues:** https://github.com/Gtajisan/baka-chan-bot/issues
- **Email:** ffjisan804@gmail.com
- **Maintainer:** Gtajisan

## License
MIT License

---
Last Updated: March 19, 2026
