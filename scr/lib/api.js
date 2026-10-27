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
const BASE = 'https://api.ikyyxd.my.id';

/**
 * GET a JSON endpoint. Pass either a path (appended to BASE) or a full URL
 * (for the couple of features that hit a different API host).
 */
async function apiGet(pathOrUrl, timeoutMs = 30000) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Uploads a buffer to catbox.moe (public, anonymous, no API key) and
 * returns a direct URL — used whenever a downstream API needs a URL to
 * fetch media from, but all we have is a locally-downloaded buffer.
 */
async function uploadToCatbox(buffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([buffer]), filename);
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
    const url = (await res.text()).trim();
    if (!url.startsWith('http')) throw new Error('Catbox upload failed: ' + url);
    return url;
}

module.exports = { apiGet, uploadToCatbox, BASE };
