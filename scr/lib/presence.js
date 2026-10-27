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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** autotype / autorecord / autorecordtype: show "typing..." / "recording..." in the chat that just wrote. */
function simulatePresence(sock, jid, settings) {
    const both = settings.get('autoRecordType', false);
    const rec = settings.get('autoRecord', false);
    const typ = settings.get('autoType', false);
    if (!both && !rec && !typ) return;
    (async () => {
        try {
            await sock.presenceSubscribe(jid);
            if (both) {
                await sock.sendPresenceUpdate('recording', jid);
                await sleep(2500);
                await sock.sendPresenceUpdate('composing', jid);
                await sleep(2500);
            } else {
                await sock.sendPresenceUpdate(rec ? 'recording' : 'composing', jid);
                await sleep(4000);
            }
            await sock.sendPresenceUpdate('paused', jid);
        } catch {
            /* presence is cosmetic */
        }
    })();
}

/** alwaysonline: keeps the account shown as online. Reads the setting every tick, so toggling needs no restart. */
function startAlwaysOnline(sock, settings) {
    if (sock.__onlineTimer) return;
    const stop = () => {
        clearInterval(sock.__onlineTimer);
        sock.__onlineTimer = null;
    };
    const tick = async () => {
        if (!settings.get('alwaysOnline', false)) return;
        try {
            await sock.sendPresenceUpdate('available');
        } catch {
            stop(); // socket is gone
        }
    };
    sock.__onlineTimer = setInterval(tick, 20000);
    sock.__onlineTimer.unref?.();
    sock.ev.on('connection.update', (u) => u.connection === 'close' && stop());
    tick();
}

module.exports = { simulatePresence, startAlwaysOnline };
