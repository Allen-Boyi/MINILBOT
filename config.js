// ─────────────────────────────────────────────
//  CIARA-IV · Central Config
//  Edit this file before deploying — no env vars needed.
// ─────────────────────────────────────────────

export const config = {
  // ── Bot identity ──────────────────────────
  botName:      'CIARA-IV',
  botNumber:    '213659832250',   // the WhatsApp number the bot runs on
  ownerNumber:  '27847826044',    // your number — auto gets Owner + Business tier

  // ── Web server ────────────────────────────
  port: 3000,   // Render/Spaceify override this via $PORT automatically

  // ── Session ───────────────────────────────
  sessionDir: './session',   // put creds.json inside this folder

  // ── OTP settings ──────────────────────────
  otpTtlMs:        5 * 60 * 1000,   // 5 minutes
  resendCooldownMs: 30 * 1000,      // 30 seconds between resend requests
  maxOtpAttempts:  5,
  sessionTtlMs: 24 * 60 * 60 * 1000, // 24 hours login session

  // ── Subscription tiers ────────────────────
  tiers: {
    free:     { label: 'Free Trial', priceUsd: 0,  maxGroups: 1,         antilink: true,  antibadword: false, ownNumber: false },
    basic:    { label: 'Basic',      priceUsd: 1,  maxGroups: 3,         antilink: true,  antibadword: false, ownNumber: false },
    plus:     { label: 'Plus',       priceUsd: 5,  maxGroups: 10,        antilink: true,  antibadword: true,  ownNumber: false },
    pro:      { label: 'Pro',        priceUsd: 10, maxGroups: 25,        antilink: true,  antibadword: true,  ownNumber: true  },
    business: { label: 'Business',   priceUsd: 25, maxGroups: Infinity,  antilink: true,  antibadword: true,  ownNumber: true  },
  },

  // ── Bot behaviour ─────────────────────────
  prefix:   '.',
  timezone: 'Africa/Harare',

  // ── Manual-add rejection message ──────────
  manualAddMsg:
    `👋 Hi! I only work in groups registered through the dashboard.\n\n` +
    `To add me properly, paste your group's invite link at the website instead of adding me directly. Leaving now. 👋`,

  manualAddDmMsg: (groupJid) =>
    `⚠️ I was added to a group (${groupJid}) that isn't registered on the dashboard, so I left automatically.\n\n` +
    `To use me in a group, paste the invite link into your dashboard and I'll join myself.`,
};
