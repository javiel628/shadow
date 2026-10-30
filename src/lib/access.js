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
/**
 * Identity + permission helpers shared by every command.
 * WhatsApp identifies people either by phone number or by an opaque LID, so every check compares
 * ALL known forms of an id (sender + senderAlt) by their digits.
 */
const digits = (s) => String(s || '').replace(/\D/g, '');
const numOf = (jid) => digits(String(jid || '').split('@')[0].split(':')[0]);

const senderNums = (m) => [...new Set([numOf(m.sender), numOf(m.senderAlt)].filter(Boolean))];
const listHas = (list, nums) => (list || []).some((x) => nums.includes(digits(x)));

const isSudo = (m, settings) => !m.fromMe && listHas(settings.get('sudo', []), senderNums(m));
const isBanned = (m, settings) => !m.fromMe && listHas(settings.get('banned', []), senderNums(m));

/** The session's own account, in every form we know. */
const ownNums = (sock) => [numOf(sock.user?.id), numOf(sock.user?.lid)].filter(Boolean);
const ownerNums = (sock, settings) => [...new Set([...ownNums(sock), ...(settings.get('owners', []) || []).map(numOf), ...(settings.get('sudo', []) || []).map(digits)])];

/** The name shown in menus and replies: the user's own choice, or the default. */
const botName = (settings, config) => settings.get('botName') || config.botName;

/**
 * Who a command is aimed at: @mention, then the replied-to person, then a typed number,
 * and (only when allowChat) the private chat itself.
 */
function resolveTarget(m, args, { allowChat = false } = {}) {
    const ctx = m.raw.message?.[m.type]?.contextInfo;
    const mentioned = ctx?.mentionedJid?.[0];
    if (mentioned) return mentioned;
    if (ctx?.quotedMessage && ctx.participant) return ctx.participant;
    const typed = (args || []).map(digits).find((d) => d.length >= 7);
    if (typed) return `${typed}@s.whatsapp.net`;
    if (allowChat && !m.isGroup) return m.from;
    return null;
}

// ---------------------------------------------------------------- groups

const metaCache = new Map(); // groupJid -> { at, meta }
async function groupMeta(sock, groupJid, fresh = false) {
    const hit = metaCache.get(groupJid);
    if (!fresh && hit && Date.now() - hit.at < 60000) return hit.meta;
    const meta = await sock.groupMetadata(groupJid);
    metaCache.set(groupJid, { at: Date.now(), meta });
    return meta;
}

const sameAccount = (p, nums) => [p.id, p.lid, p.phoneNumber, p.jid].map(numOf).some((n) => n && nums.includes(n));

/** Admin check. A "no" is re-checked once with fresh data, so a recent promotion is never missed. */
async function isGroupAdmin(sock, groupJid, nums) {
    for (const fresh of [false, true]) {
        try {
            const meta = await groupMeta(sock, groupJid, fresh);
            const p = (meta.participants || []).find((x) => sameAccount(x, nums));
            if (p && p.admin) return true;
        } catch {
            /* try again fresh */
        }
    }
    return false;
}

const botIsAdmin = (sock, groupJid) => isGroupAdmin(sock, groupJid, ownNums(sock));

/**
 * The phone-number JID of a group member (object from groupMetadata, or a jid string).
 * WhatsApp only turns "@123" into a tappable mention when the mentioned JID is the phone-number form;
 * LID ids show up as raw digits. Falls back to the LID mapping, then to whatever id we have.
 */
async function pnOf(sock, p) {
    const obj = typeof p === 'string' ? { id: p } : p || {};
    const ids = [obj.phoneNumber, obj.jid, obj.id].filter(Boolean).map(String);
    const pn = ids.find((j) => j.endsWith('@s.whatsapp.net'));
    if (pn) return pn;
    const lid = ids.find((j) => j.endsWith('@lid'));
    if (!lid) return ids[0];
    const map = sock.signalRepository?.lidMapping;
    for (const arg of [lid, lid.split('@')[0]]) {
        try {
            const r = await map?.getPNForLID?.(arg);
            if (r) return String(r).includes('@') ? String(r).replace(/:\d+(?=@)/, '') : `${digits(r)}@s.whatsapp.net`;
        } catch {
            /* mapping unavailable */
        }
    }
    return lid;
}

module.exports = { pnOf, sameAccount, digits, numOf, senderNums, isSudo, isBanned, ownNums, ownerNums, botName, resolveTarget, groupMeta, isGroupAdmin, botIsAdmin };
