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
 * Auto status view / like.
 *
 * Why the old version failed: status posts live in the chat "status@broadcast", and the poster is in
 * key.participant - but the serializer reported the sender as "status@broadcast" itself, so the reaction
 * was addressed to nobody. This module reads the poster from the raw key and builds the recipient list
 * WhatsApp needs (poster + own account), in both phone-number and LID form.
 */

const seen = new Set(); // status ids already handled (re-deliveries must not react twice)
let chain = Promise.resolve(); // one status at a time, with human-like pauses (avoids spam flags)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => min + Math.floor(Math.random() * (max - min));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// message kinds that are not real status posts
const IGNORED_KINDS = new Set(['protocolMessage', 'reactionMessage', 'senderKeyDistributionMessage', 'messageContextInfo']);

const normalize = (jid) => (jid ? jid.replace(/:\d+(?=@)/, '') : null);

function realKind(message) {
    return Object.keys(message || {}).find((k) => !IGNORED_KINDS.has(k)) || null;
}

/** Returns true when the message belonged to status@broadcast (handled or skipped), false otherwise. */
function handleStatus(sock, raw, settings) {
    const key = raw?.key;
    if (key?.remoteJid !== 'status@broadcast') return false;
    if (key.fromMe || !raw.message || !realKind(raw.message)) return true;

    const view = settings.get('autoStatusView', false);
    const like = settings.get('autoStatusLike', false);
    if (!view && !like) return true;

    const id = key.id;
    if (!id || seen.has(id)) return true;
    seen.add(id);
    if (seen.size > 1000) seen.delete(seen.values().next().value);

    chain = chain
        .then(async () => {
            await sleep(rand(1500, 4000));

            const poster = normalize(key.participant);
            const posterAlt = normalize(key.participantAlt || key.participantPn);
            const label = (poster || posterAlt || 'unknown').split('@')[0];

            if (view) {
                try {
                    await sock.readMessages([key]);
                    log.success('status', `viewed status from ${label}`);
                } catch (err) {
                    log.warn('status', `view failed: ${err.message}`);
                }
            }

            if (like) {
                const emojis = settings.get('statusEmojis', ['❤️']);
                const recipients = [poster, posterAlt, normalize(sock.user?.id), normalize(sock.user?.lid)].filter(Boolean);
                try {
                    await sleep(rand(400, 1200));
                    await sock.sendMessage('status@broadcast', { react: { text: pick(emojis.length ? emojis : ['❤️']), key } }, { statusJidList: [...new Set(recipients)] });
                    log.success('status', `liked status from ${label}`);
                } catch (err) {
                    log.warn('status', `like failed: ${err.message}`);
                }
            }
        })
        .catch(() => {});

    return true;
}

module.exports = { handleStatus };
