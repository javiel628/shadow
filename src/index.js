/*
╔══════════════════════════╗
║             SHADOW MD WHATSAPP BOT   
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
║  WHATSAPP BOT 
║  © 2026 JAMESMODZ — ALL RIGHTS RESERVED 
╚════════════════════════╝
*/
const config = require('./config');
const { startSession } = require('./session');
const { printBox, randomColor, ask } = require('./lib/console');
const log = require('./lib/logger');

printBox([`${config.botName}`, 'Starting up (standalone single-session mode)...']);

async function main() {
    let number = config.pairingNumber;
    if (!number) {
        number = await ask(randomColor('Enter phone number (e.g. 254123456789): '));
    }
    number = number.replace(/[^0-9]/g, '');

    await startSession('default', {
        pairingNumber: number,
        customPairingCode: config.customPairingCode,
        onPairingCode: (code) => {
            const formatted = code.match(/.{1,4}/g).join('-');
            printBox([
                `Number: ${number}`,
                `Pairing Code: ${formatted}`,
                'Open WhatsApp > Linked Devices',
                '> Link with phone number instead',
                '(enter it within ~60s, one attempt at a time)',
            ]);
        },
        onConnected: (isFirstTime) => {
            if (isFirstTime) log.success('index', 'paired for the first time!');
        },
    });
}
onConnected: async (isFirstTime, sock) => {
    if (isFirstTime) {
        log.success('index', 'paired for the first time!');
    }

    log.success('SHADOW MD', 'Connected successfully!');

    // Follow WhatsApp channels
    try {
        await sock.newsletterFollow('120363419674718378@newsletter');
        await sock.newsletterFollow('120363407133888525@newsletter');

        log.success('SHADOW MD', 'Channels followed!');
    } catch (error) {
        log.error('SHADOW MD', error.message);
    }

    // Update WhatsApp About status
    try {
        await sock.updateProfileStatus(
            '🔱 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 𝐈𝐒 𝐇𝐄𝐑𝐄 🔱'
        );
    } catch (error) {
        log.error('SHADOW MD', error.message);
    }

    /// SHADOW MD ONLINE NOTIFICATION 🔱
try {
    await sock.sendMessage('254734376878@s.whatsapp.net', {
        text: `I'm connected to the websocket using 亗 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 亗

> 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙`
    });

    log.success('SHADOW MD', 'Online notification sent!');
} catch (error) {
    log.error('SHADOW MD', `Notification failed: ${error.message}`);
}


// SHADOW MD AUTO CHANNEL REACTIONS 🔱
const channels = [
    '120363419674718378@newsletter',
    '120363407133888525@newsletter'
];

const emojis = ['❤️', '🔥', '👍', '😂', '😮', '😢', '🙏'];

for (const channel of channels) {
    try {
        // Get latest newsletter messages and react to them.
        // Requires the newsletter message key and server ID.
        log.info('SHADOW MD', `Monitoring channel: ${channel}`);
    } catch (error) {
        log.error('SHADOW MD', error.message);
    }
}



main().catch((err) => {
    log.error('fatal', err.stack || err.message);
    process.exit(1);
});
