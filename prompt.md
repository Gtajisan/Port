here all changes we was did before on this source all changes and all we did.


Here's the updated prompt with **strict stock repo structure preservation**:

---

> # 🚀 PROJECT SAKURA — BAKA-CHAN INSTAGRAM EDITION
> ### *Enterprise Instagram Port — Zero Structural Changes Policy*
>
> ---
>
> ## 📋 MISSION BRIEF
>
> You are the **Lead Principal Engineer** on a large-scale open-source porting initiative. Your mission is to port the existing **Baka-chan Facebook Messenger Bot** to Instagram with **absolute zero changes** to the original repository structure, file names, folder layout, or internal logic. The original repo must look and feel **100% identical** — only a new invisible adapter layer is injected underneath.
>
> ---
>
> ## 🔗 SOURCE REPOSITORY
>
> ```
> https://github.com/Gtajisan/Baka-chan-bot.git
> ```
>
> **Step 1 — Clone and audit every single file:**
> ```bash
> git clone https://github.com/Gtajisan/Baka-chan-bot.git
> cd Baka-chan-bot
> ```
>
> **Step 2 — Map the entire stock structure BEFORE touching anything:**
> ```
> Baka-chan-bot/                        ← ROOT (NEVER RENAME)
> ├── index.js                          ← PRESERVE FILENAME EXACTLY
> ├── config.json                       ← PRESERVE AS-IS
> ├── package.json                      ← ONLY ADD, NEVER REMOVE
> ├── package-lock.json                 ← REGENERATE SAFELY
> ├── .env                              ← ADD NEW (was missing)
> ├── .env.example                      ← ADD NEW
> ├── .gitignore                        ← PRESERVE OR EXTEND ONLY
> ├── README.md                         ← EXTEND, NEVER OVERWRITE
> ├── session.json                      ← ADD NEW (Instagram session)
> ├── 📂 commands/                      ← EVERY FILE INSIDE UNTOUCHED
> │   └── [ALL ORIGINAL FILES]          ← ZERO MODIFICATIONS
> ├── 📂 events/                        ← EVERY FILE INSIDE UNTOUCHED
> │   └── [ALL ORIGINAL FILES]          ← ZERO MODIFICATIONS
> ├── 📂 utils/ (if exists)             ← EVERY FILE INSIDE UNTOUCHED
> │   └── [ALL ORIGINAL FILES]          ← ZERO MODIFICATIONS
> └── 📂 instagram/                     ← ONLY NEW FOLDER ADDED
>     ├── adapter.js                    ← FCA → Instagram bridge
>     ├── messageMapper.js              ← Event object translator
>     ├── sessionManager.js             ← Login + session handler
>     ├── mediaHandler.js               ← Attachment processor
>     ├── rateLimiter.js                ← Anti-spam / rate control
>     └── logger.js                     ← Colored structured logger
> ```
>
> ---
>
> ## ⚖️ GOLDEN RULES — NEVER BREAK THESE
>
> ```
> ❌ NEVER rename any original file
> ❌ NEVER move any original file to a different folder
> ❌ NEVER delete any original file
> ❌ NEVER rewrite logic inside commands/ or events/
> ❌ NEVER change the exports/imports style of original files
> ❌ NEVER alter config.json structure — only extend it
> ❌ NEVER add new folders outside of instagram/ except .env files
> ✅ ONLY modify index.js minimally — swap API source, keep all logic
> ✅ ONLY add new files, never replace existing ones
> ✅ ONLY extend package.json dependencies, never remove existing ones
> ```
>
> ---
>
> ## 🔧 THE ONLY ALLOWED CHANGE — index.js SURGICAL EDIT
>
> Open the original `index.js` and make **only this one change** — replace the FCA/Messenger login block with the Instagram adapter import. Everything else in `index.js` stays byte-for-byte identical:
>
> ```javascript
> // ════════════════════════════════════════════
> // ORIGINAL LINE (REMOVE ONLY THIS):
> // const login = require("fca-unofficial");
> // login({email, password}, (err, api) => { ... })
>
> // REPLACE WITH ONLY THIS (NOTHING ELSE CHANGES):
> const { createInstagramAPI } = require("./instagram/adapter");
>
> (async () => {
>   const api = await createInstagramAPI(); // Drop-in FCA replacement
>   // ↓↓↓ ALL ORIGINAL index.js CODE BELOW THIS LINE STAYS IDENTICAL ↓↓↓
> })();
> // ════════════════════════════════════════════
> ```
>
> The `api` object returned by `createInstagramAPI()` must be **100% interface-compatible** with the original FCA api object so zero other files need changes.
>
> ---
>
> ## 🔌 INSTAGRAM ADAPTER — FULL FCA INTERFACE CLONE
>
> Build `instagram/adapter.js` to return an `api` object that perfectly mirrors FCA:
>
> ```javascript
> // instagram/adapter.js
> // Must export an api object that looks EXACTLY like fca-unofficial to the rest of the bot
>
> module.exports.createInstagramAPI = async () => {
>
>   // 1. Login or restore session via sessionManager
>   // 2. Return this exact interface shape:
>
>   return {
>
>     // Core messaging — identical signatures to FCA
>     sendMessage: (msg, threadID, callback) => {},
>     sendTypingIndicator: (threadID, callback) => {},
>     markAsRead: (threadID, callback) => {},
>     unsendMessage: (messageID, callback) => {},
>
>     // User & thread info — identical signatures to FCA
>     getUserInfo: (id, callback) => {},
>     getThreadInfo: (threadID, callback) => {},
>     getThreadList: (limit, timestamp, callback) => {},
>
>     // Reactions — identical signatures to FCA
>     setMessageReaction: (reaction, messageID, callback) => {},
>
>     // Listener — identical signature to FCA
>     listenMqtt: (callback) => {},   // Maps Instagram realtime → FCA event format
>
>     // Bot info
>     getCurrentUserID: () => {},
>     getFriendsList: (callback) => {},
>
>   };
> };
>
> // EVENT OBJECT SHAPE — must match FCA exactly so all events/ files work:
> const fcaCompatibleEvent = {
>   type: "message",           // "message" | "event" | "read" | "typ"
>   body: "",                  // Message text content
>   senderID: "",              // Instagram user ID as string
>   threadID: "",              // Thread ID as string
>   messageID: "",             // Message ID as string
>   attachments: [],           // Array of attachment objects
>   timestamp: Date.now(),     // Unix timestamp in ms
>   isGroup: false,            // Boolean
>   mentions: {},              // Mention map object
>   participantIDs: [],        // Thread participant IDs
> };
> ```
>
> ---
>
> ## 📂 NEW FILES TO CREATE — COMPLETE SPECIFICATION
>
> ### `instagram/sessionManager.js`
> ```
> - Load session from session.json if it exists
> - If session invalid or missing → fresh login with IG_USERNAME + IG_PASSWORD
> - Save new session to session.json after successful login
> - Encrypt session.json using Node crypto AES-256
> - Auto-refresh session on expiry without restart
> - Log all session events via logger.js
> ```
>
> ### `instagram/messageMapper.js`
> ```
> - Convert raw Instagram DM payload → FCA-compatible event object
> - Convert raw Instagram thread → FCA-compatible thread object
> - Convert raw Instagram user → FCA-compatible userInfo object
> - Handle: text messages, image, video, audio, sticker, story reply, reactions
> - Map Instagram thread IDs and user IDs to FCA string format
> ```
>
> ### `instagram/mediaHandler.js`
> ```
> - Download Instagram media (images, videos) as buffers
> - Upload media to Instagram DMs as attachments
> - Convert attachment format from FCA style → Instagram API style
> - Use sharp for image optimization before sending
> - Support: jpg, png, gif, mp4, mp3
> ```
>
> ### `instagram/rateLimiter.js`
> ```
> - Max 30 messages per user per 60 seconds
> - Exponential backoff on Instagram API rate limit errors: 1s→2s→4s→8s→16s
> - Cooldown warning message to user on rate limit hit
> - Per-thread and per-user independent rate tracking
> - Auto-reset counters every 60 seconds
> ```
>
> ### `instagram/logger.js`
> ```
> - Color-coded console output using chalk:
>   [INFO]  → cyan
>   [WARN]  → yellow
>   [ERROR] → red
>   [DEBUG] → gray
>   [CMD]   → green  (every command execution)
>   [DM]    → magenta (every incoming message)
> - Write logs to logs/sakura.log with daily rotation
> - Log format: [2026-03-19 14:32:01] [LEVEL] message
> ```
>
> ---
>
> ## 📦 package.json — ADD ONLY, NEVER REMOVE
>
> Keep every single existing dependency. Only append these new ones:
>
> ```json
> "dependencies": {
>   "instagram-private-api": "^1.45.3",
>   "dotenv": "^16.4.5",
>   "axios": "^1.6.8",
>   "chalk": "^4.1.2",
>   "winston": "^3.13.0",
>   "winston-daily-rotate-file": "^5.0.0",
>   "sharp": "^0.33.3",
>   "node-cache": "^5.1.2",
>   "node-cron": "^3.0.3",
>   "better-sqlite3": "^9.4.3",
>   "express": "^4.19.2"
> }
> ```
>
> ---
>
> ## 🔐 .env.example — CREATE THIS EXACTLY
>
> ```env
> # ╔══════════════════════════════════════╗
> # ║     BAKA-CHAN BOT — INSTAGRAM        ║
> # ║     Environment Configuration        ║
> # ╚══════════════════════════════════════╝
>
> # Instagram Account Credentials
> IG_USERNAME=your_instagram_username
> IG_PASSWORD=your_instagram_password
>
> # Bot Settings (matches original config.json fields)
> BOT_NAME=Baka-Chan
> PREFIX=!
> ADMIN_ID=your_instagram_numeric_user_id
> BOT_VERSION=2.0.0
> NODE_ENV=production
>
> # Session Security
> SESSION_SECRET=change_this_to_random_256bit_key
>
> # Optional AI Features
> OPENAI_API_KEY=optional_leave_blank_if_unused
> GEMINI_API_KEY=optional_leave_blank_if_unused
>
> # Rate Limiting
> RATE_LIMIT_MAX=30
> RATE_LIMIT_WINDOW_MS=60000
>
> # Logging
> LOG_LEVEL=info
> ```
>
> ---
>
> ## ⚙️ config.json — EXTEND ONLY, NEVER RESTRUCTURE
>
> Read the original `config.json` fields. Keep them all 100% intact. Only append a new `instagram` block at the bottom:
>
> ```json
> {
>   // ... ALL ORIGINAL FIELDS STAY EXACTLY AS THEY ARE ...
>
>   "instagram": {
>     "sessionFile": "session.json",
>     "autoReact": true,
>     "typingIndicator": true,
>     "markAsRead": true,
>     "retryAttempts": 5,
>     "retryDelay": 1000,
>     "mediaDownloadPath": "temp/media"
>   }
> }
> ```
>
> ---
>
> ## 🖥️ Replit Configuration Files
>
> ### `.replit`
> ```toml
> run = "node index.js"
> entrypoint = "index.js"
>
> [nix]
> channel = "stable-23_11"
>
> [deployment]
> run = ["sh", "-c", "node index.js"]
> deploymentTarget = "cloudrun"
>
> [[ports]]
> localPort = 3000
> externalPort = 80
> ```
>
> ### `replit.nix`
> ```nix
> { pkgs }: {
>   deps = [
>     pkgs.nodejs_20
>     pkgs.ffmpeg
>     pkgs.python3
>     pkgs.libjpeg
>     pkgs.libpng
>     pkgs.pkg-config
>   ];
> }
> ```
>
> ---
>
> ## ✅ FINAL ACCEPTANCE CHECKLIST
>
> Complete every item before declaring done:
>
> ```
> STRUCTURE INTEGRITY:
> ☐ git diff --name-only shows ZERO changes to original files
> ☐ commands/ folder — all files identical to source repo
> ☐ events/ folder — all files identical to source repo
> ☐ index.js — only the login block changed, nothing else
> ☐ config.json — original fields untouched, only extended
> ☐ package.json — original deps untouched, only extended
>
> FUNCTIONALITY:
> ☐ Bot logs in to Instagram using .env credentials
> ☐ Session saved to session.json after first login
> ☐ Bot restores session on restart without re-login
> ☐ Bot receives Instagram DMs in real-time
> ☐ Every original command works in Instagram DMs
> ☐ Every original event fires correctly
> ☐ FCA api object fully compatible — zero command errors
> ☐ Media attachments send and receive correctly
> ☐ Typing indicator and mark-as-read working
> ☐ Rate limiter blocks spam automatically
> ☐ Admin commands protected by permission check
>
> PRODUCTION QUALITY:
> ☐ Zero unhandled promise rejections on startup
> ☐ Zero crashes during normal operation
> ☐ Colored structured logs output to console
> ☐ Log file written to logs/sakura.log
> ☐ Express health endpoint live at :3000/health
> ☐ .env.example fully documented
> ☐ README.md updated with Instagram setup section
> ```
>
> ---
>
> **BEGIN EXECUTION NOW.**
> Clone the repo. Audit every file. Inject only the `instagram/` adapter layer. Make the single surgical edit to `index.js`. Deliver a production-ready Instagram chatbot where the original repo looks completely untouched to any contributor who clones it. No placeholder code. No TODOs. Full working implementation only.

---
next prompt -

Fix everything broken stuff and bug etc blah blah blah as like a professional coder with sense with our all data brain 🧠

another we did by Agent -

First read the stock source and analyse everything and do modification and rebuild with our project logic keeping everything from stock source and rebuilding
# important note must read 
it was de did bot do this modification aging already it all done just check and clarify all does all done or not.
Make readme.md to understand how to use also make api folder all needed files and readme.md etc all library files.