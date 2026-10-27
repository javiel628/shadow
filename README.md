# 亗 SHADOW MD 亗 — WhatsApp Bot

WhatsApp-only build using Baileys phone-number pairing. Telegram bot files and Telegram-specific dependencies have been removed.

## Requirements
- Node.js 18 or newer (Node.js 20/22 recommended)
- A WhatsApp account you own or are authorized to link

## Run locally
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`.
3. Set `PAIRING_NUMBER` to your full international phone number using digits only (for example, `254712345678`). Do not include `+`, spaces, or hyphens.
4. Optionally set `CUSTOM_PAIRING_CODE` to an 8-character code, or leave it blank to let WhatsApp generate one.
5. Start the bot: `npm start`
6. Read the pairing code in the terminal. On your phone, open WhatsApp → Linked devices → Link a device → Link with phone number instead, then enter the code.

If `PAIRING_NUMBER` is blank, the bot asks for the number in the terminal. For cloud deployment, set it as an environment variable in the hosting dashboard because cloud hosts may not provide an interactive terminal.

## Deploying to a Node.js host
- Build/install command: `npm install`
- Start command: `npm start`
- Runtime: Node.js 18+
- Set `BOT_NAME`, `PREFIX`, `PAIRING_NUMBER`, and optionally `CUSTOM_PAIRING_CODE` as environment variables.
- Use persistent storage for the `session/` directory. If the host deletes this directory on restart/redeploy, you will need to pair again. Keep the session private; it contains login credentials.

## Security notes
- Never upload `.env` or the `session/` directory publicly.
- The original archive included a Telegram bot token. It has been removed from this cleaned project. If that token was real, revoke/regenerate it in BotFather because it was exposed in the uploaded archive.
- Pair only an account you own or have permission to link.

## Important
This package was cleaned and source syntax-checked, but a live WhatsApp pairing test requires installing dependencies and linking a real WhatsApp account.


## Render deployment (Background Worker)

1. Push the contents of this project folder to a **private** GitHub repository.
2. In Render, create **New + → Background Worker** and connect that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
   - `BOT_NAME` = `亗 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 亗`
   - `PREFIX` = `.`
   - `PAIRING_NUMBER` = your own WhatsApp number in international digits only (e.g. `2547XXXXXXXX`)
   - `SESSION_DIR` = `/var/data/session`
   - `DATA_DIR` = `/var/data/data/sessions`
6. Attach a persistent disk to the worker mounted at `/var/data`. Persistent disks generally require a paid Render service; without one, session files can be lost during a restart/redeploy and pairing may be required again.
7. Deploy and watch the service logs for the WhatsApp pairing code. On your phone, use WhatsApp → Linked devices → Link a device → Link with phone number instead.

Do not commit `.env`, session files, or WhatsApp credentials to GitHub. Use a WhatsApp account you own or have permission to link. This project has not been live-tested against WhatsApp from Render; successful dependency installation and pairing must be confirmed in the Render logs.
