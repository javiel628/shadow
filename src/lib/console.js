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
const readline = require('readline');

const COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

function randomColor(text) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return chalk[color].bold(text);
}

/**
 * Prints lines inside an aligned box border, each line in its own
 * randomly chosen color. Width auto-fits the longest line.
 */
function printBox(lines) {
    const width = Math.max(...lines.map((l) => l.length)) + 2;
    const top = '╔' + '═'.repeat(width) + '╗';
    const bottom = '╚' + '═'.repeat(width) + '╝';

    console.log(randomColor(top));
    for (const line of lines) {
        const padded = ' ' + line + ' '.repeat(width - line.length - 1);
        console.log(randomColor('║') + randomColor(padded) + randomColor('║'));
    }
    console.log(randomColor(bottom));
}

/**
 * Prompts the user for input in the terminal and resolves with the answer.
 */
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

module.exports = { printBox, randomColor, ask };
