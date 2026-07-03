# CIARA-IV — WhatsApp Group Management Platform

A combined WhatsApp bot + web dashboard. Users register via WhatsApp OTP,
add their groups via invite link, and manage moderation settings from the dashboard.

---

## 🚀 Deploy on Render (recommended)

1. **Upload your `creds.json`** — place it inside a folder called `session/`:
   ```
   session/
     creds.json
   ```
   Zip and upload the whole project (this folder is gitignored locally but must be present on the server).

2. **Create a new Web Service** on [render.com](https://render.com)
   - Environment: `Node`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Node version: `18` or higher

3. **Set environment variables** in the Render dashboard:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `OWNER_NUMBER` | `27847826044` |

4. Deploy — the bot and website start together.

---

## 🚀 Deploy on Spaceify / any Node panel

1. Upload the project zip and extract it.
2. Set startup command to: `node server.js`
3. Set Node version to 18+.
4. Add environment variables (see above).
5. Place your `creds.json` inside the `session/` folder before starting.

---

## 📁 Project structure

```
CIARA-IV-main/
├── server.js          ← Unified entrypoint (web server + starts bot)
├── index.js           ← Baileys bot connection
├── handler.js         ← Message dispatch + moderation pipeline
├── commands/
│   ├── group/         ← Group management commands (kick, ban, warn, antilink…)
│   ├── ai/            ← AI commands
│   ├── convert/       ← Media conversion
│   └── …
├── lib/
│   ├── groupSettings.js  ← Per-group moderation state (JSON DB)
│   ├── userStore.js      ← User accounts, OTP, sessions, tiers (JSON DB)
│   └── myfunc.js         ← Shared bot utilities
├── public/
│   └── index.html     ← iOS-styled dashboard (served by Express)
├── session/           ← ← PUT creds.json IN HERE ←
│   └── creds.json
├── database.json      ← Auto-created on first run (users + groups)
├── render.yaml        ← Render deployment config
├── Procfile           ← For Spaceify / Heroku-style panels
└── .env.example       ← Copy to .env for local dev
```

---

## 🔐 How OTP login works

1. User enters their WhatsApp number on the site.
2. The bot DMs them:
   ```
   🔐 CIARA-IV Verification
   Your verification code is: 482913
   ⏳ Expires in 5 minutes
   🚫 Never share this code with anyone
   ```
3. User enters the code — they're logged in for **24 hours**.
4. Session is stored in a secure HTTP-only cookie.

---

## 💰 Subscription tiers

| Tier | Price | Groups | Antibadword | Own number |
|------|-------|--------|-------------|------------|
| Free | $0 | 1 | ✗ | ✗ |
| Basic | $1/mo | 3 | ✗ | ✗ |
| Plus | $5/mo | 10 | ✓ | ✗ |
| Pro | $10/mo | 25 | ✓ | ✓ |
| Business | $25/mo | Unlimited | ✓ | ✓ |

The owner can change any user's tier from the Owner tab in the dashboard.

---

## 🤖 Bot behaviour

- **Manual group adds are rejected** — bot leaves + DMs the admin explaining to use the invite link flow.
- **Banned users are re-kicked** if they try to rejoin via a new invite.
- **Antilink**, **antibadword**, and **mute** enforcement runs on every message.
- Admins and the owner are exempt from all moderation.

---

## 🛠 Local development

```bash
cp .env.example .env
# edit .env with your number
npm install
node server.js
# scan QR in terminal on first run
# open http://localhost:3000
```
