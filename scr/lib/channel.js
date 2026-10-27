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
const log = require('./logger');

/**
 * Auto-react to posts on your WhatsApp channel (newsletter).
 * Configure the channel in src/Anix.js (CHANNEL.link or CHANNEL.jid).
 *
 * - On connect, the session resolves the channel (invite link -> @newsletter id) and follows it,
 *   because WhatsApp only delivers posts of channels the account follows.
 * - Every new post then gets a reaction from a random emoji of CHANNEL.emojis.
 */

const resolved = new Map(); // invite code -> channel jid
const reacted = new Set(); // "jid:serverId" already reacted to
let chain = Promise.resolve();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function inviteCode(link) {
    const m = String(link || '').match(/channel\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
}

async function resolveChannelJid(sock, cfg) {
    if (cfg.jid && cfg.jid.endsWith('@newsletter')) return cfg.jid;
    const code = inviteCode(cfg.link);
    if (!code) return null;
    if (resolved.has(code)) return resolved.get(code);
    const meta = await sock.newsletterMetadata('invite', code);
    if (!meta?.id) return null;
    resolved.set(code, meta.id);
    return meta.id;
}

/** Call once per session when the connection opens. */
async function followChannel(sock, cfg) {
    try {
        const jid = await resolveChannelJid(sock, cfg);
        if (!jid) return log.warn('channel', 'no valid channel set in Anix.js (CHANNEL.link / CHANNEL.jid)');
        try {
            await sock.newsletterFollow(jid);
        } catch {
            /* already following */
        }
        if (typeof sock.subscribeNewsletterUpdates === 'function') await sock.subscribeNewsletterUpdates(jid).catch(() => {});
        log.success('channel', `watching ${jid} for new posts`);
    } catch (err) {
        log.warn('channel', `could not follow channel: ${err.message}`);
    }
}

/** Returns true when the message was a channel post (reacted or skipped), false otherwise. */
function handleChannelPost(sock, raw, cfg, settings) {
    const jid = raw?.key?.remoteJid;
    if (!jid || !jid.endsWith('@newsletter')) return false;
    if (!raw.message || !settings.get('channelReact', true)) return true;

    const serverId = raw.key.server_id ?? raw.server_id ?? raw.newsletterServerId;
    if (!serverId) {
        log.warn('channel', 'post received without a server id - cannot react');
        return true;
    }

    chain = chain
        .then(async () => {
            const target = await resolveChannelJid(sock, cfg).catch(() => null);
            if (target && target !== jid) return; // a different channel
            const id = `${jid}:${serverId}`;
            if (reacted.has(id)) return;
            reacted.add(id);
            if (reacted.size > 500) reacted.delete(reacted.values().next().value);

            await sleep(1000 + Math.floor(Math.random() * 2500));
            await sock.newsletterReactMessage(jid, String(serverId), pick(cfg.emojis));
            log.success('channel', `reacted to post ${serverId}`);
        })
        .catch((err) => log.warn('channel', `react failed: ${err.message}`));

    return true;
}

module.exports = { followChannel, handleChannelPost };
