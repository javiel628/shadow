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
const crypto = require('crypto');

/**
 * Post a status update INTO a group (the "group status" feature), not to your personal status.
 *
 * payload examples:
 *   { text: 'hello' }
 *   { image: Buffer, caption: 'hi' }
 *   { video: Buffer, caption: 'hi' }
 *   { audio: Buffer, mimetype: 'audio/mp4' }
 *
 * Two delivery paths, picked automatically:
 *   1. the library knows the groupStatusMessageV2 protobuf field -> build + relay the message ourselves
 *   2. otherwise -> the fork's own sendMessage(jid, { groupStatusMessage }) helper
 */
async function postGroupStatus(sock, groupJid, payload) {
    const baileys = require('./baileys');
    const { generateWAMessageContent, generateWAMessageFromContent, proto } = baileys;

    const knowsV2 = !!proto?.Message?.prototype && 'groupStatusMessageV2' in proto.Message.prototype;

    if (knowsV2 && generateWAMessageContent && generateWAMessageFromContent) {
        const secret = crypto.randomBytes(32);
        const inner = await generateWAMessageContent(payload, { upload: sock.waUploadToServer });
        const full = generateWAMessageFromContent(
            groupJid,
            {
                messageContextInfo: { messageSecret: secret },
                groupStatusMessageV2: { message: { ...inner, messageContextInfo: { messageSecret: secret } } },
            },
            { userJid: sock.user.id }
        );
        await sock.relayMessage(groupJid, full.message, { messageId: full.key.id });
        return full.key;
    }

    return sock.sendMessage(groupJid, { groupStatusMessage: payload });
}

module.exports = { postGroupStatus };
