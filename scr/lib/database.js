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
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Minimal flat-file JSON store. One file per named collection.
 * Good enough for small bots; swap for a real DB if you scale up.
 */
class JSONStore {
    constructor(name, defaultValue = {}) {
        this.file = path.join(DATA_DIR, `${name}.json`);
        this.data = defaultValue;
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.file)) {
                this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
            } else {
                this._save();
            }
        } catch (err) {
            console.error(`[database] failed to load ${this.file}:`, err.message);
        }
    }

    _save() {
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    }

    get(key, fallback = undefined) {
        return key in this.data ? this.data[key] : fallback;
    }

    set(key, value) {
        this.data[key] = value;
        this._save();
        return value;
    }

    delete(key) {
        delete this.data[key];
        this._save();
    }

    all() {
        return this.data;
    }
}

module.exports = { JSONStore };
