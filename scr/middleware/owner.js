/*
╔══════════════════════════╗
║             𓆩 BASE TELE X WA 𓆪   
║                                      
║             ⚡ DEVELOPER CREDITS ⚡      
║                                   
║          ᴅᴇᴠᴇʟᴏᴘᴇʀ : ᴊᴀᴍᴇsᴍᴏᴅᴢ  
║          ᴛᴇᴀᴍ      : james Inc 

║  ⚠️  C R E D I T   N O T I C E  ⚠️ 

║  Do NOT remove or modify these credits
║  without permission from the original dev
║  Respect the work. Give credit where it's
║  due. Don't steal another developer's work.
║  TELEGRAM : t.me/shenxidev 
║  © 2026 JAMESMODZ — ALL RIGHTS RESERVED 
╚════════════════════════╝
*/
const { numOf, senderNums } = require('../lib/access');

/**
 * True if the message sender is one of THIS session's owners (or the session's own bot number).
 * Owners are per-session: each session carries its own `owners` array in its own settings.
 * Sudo users (see .addsudo) are checked separately in Anix.js and get the same powers.
 *
 * NOTE: this check trusts msg.key.fromMe / participant as reported by the Baileys layer beneath it.
 * There is a known Baileys CVE (2026-48063, fixed in 6.7.22 / 7.0.0-rc12) where a crafted payload can
 * spoof message keys on messages.upsert. Confirm which base version your baileys build branched from
 * before treating owner-gated commands as fully trustworthy.
 */
function isOwner(m, owners) {
    if (m.fromMe) return true;
    const owned = (owners || []).map(numOf);
    return senderNums(m).some((n) => owned.includes(n));
}

module.exports = { isOwner };
