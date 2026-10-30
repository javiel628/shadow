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
const chalk = require('chalk');

function timestamp() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
}

module.exports = {
    info(tag, msg) {
        console.log(chalk.gray(`[${timestamp()}]`), chalk.cyan(`[${tag}]`), msg);
    },
    success(tag, msg) {
        console.log(chalk.gray(`[${timestamp()}]`), chalk.green(`[${tag}]`), msg);
    },
    warn(tag, msg) {
        console.log(chalk.gray(`[${timestamp()}]`), chalk.yellow(`[${tag}]`), msg);
    },
    error(tag, msg) {
        console.log(chalk.gray(`[${timestamp()}]`), chalk.red(`[${tag}]`), msg);
    },
    // For an incoming command: from, command, args — one clean line per command.
    command(from, cmd) {
        console.log(chalk.gray(`[${timestamp()}]`), chalk.magenta('[cmd]'), chalk.white(from), chalk.gray('→'), chalk.bold(cmd));
    },
};
