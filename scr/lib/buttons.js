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
/** A message with ONE native "copy" button (tap = value goes to the clipboard). Falls back to plain text. */
async function sendCopy(m, { title, text, value, label = 'Copy', footer = '' }) {
    try {
        await m.send({
            interactiveMessage: {
                header: title,
                title: text,
                footer,
                nativeFlowMessage: {
                    buttons: [{ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: label, id: 'copy_value', copy_code: String(value) }) }],
                },
            },
        });
    } catch {
        await m.reply(`${text}\n\n${value}`);
    }
}

module.exports = { sendCopy };
