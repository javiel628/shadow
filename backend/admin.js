
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { listSavedSessionIds, isConnected, removeSession } =
    require('../src/session');

const router = express.Router();

const USERNAME = process.env.ADMIN_USERNAME || 'SMILEMODS';
const PASSWORD = process.env.ADMIN_PASSWORD || '00';
const SECRET = process.env.ADMIN_SECRET || 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';

const STORAGE_ROOT = process.env.SHADOW_DATA_DIR || process.cwd();
const AUTH_ROOT = path.join(STORAGE_ROOT, 'session');

const COOKIE_NAME = 'shadow_admin';
const TOKEN_LIFETIME = 8 * 60 * 60 * 1000;

const loginAttempts = new Map();

function sign(value) {
    return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function createToken() {
    const payload = Buffer.from(JSON.stringify({
        exp: Date.now() + TOKEN_LIFETIME,
        nonce: crypto.randomBytes(16).toString('hex')
    })).toString('base64url');

    return `${payload}.${sign(payload)}`;
}

function validToken(token) {
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const expected = sign(payload);

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return false;
    }

    try {
        const data = JSON.parse(
            Buffer.from(payload, 'base64url').toString()
        );

        return Number(data.exp) > Date.now();
    } catch {
        return false;
    }
}

function requireAdmin(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];

    if (!validToken(token)) {
        return res.status(401).json({
            success: false,
            message: 'Admin login required'
        });
    }

    next();
}

function getPhoneNumber(sessionId) {
    try {
        const file = path.join(AUTH_ROOT, sessionId, 'creds.json');
        const creds = JSON.parse(fs.readFileSync(file, 'utf8'));
        const jid = creds.me?.id || creds.me?.phoneNumber || '';

        const number = String(jid)
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '');

        return number ? `+${number}` : 'Unavailable';
    } catch {
        return 'Unavailable';
    }
}

function isPortalSession(id) {
    return /^web_[a-f0-9]{32}$/i.test(id);
}

router.post('/login', (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || [];

    const recent = attempts.filter(time => now - time < 15 * 60 * 1000);

    if (recent.length >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Too many login attempts. Try again later.'
        });
    }

    const { username, password } = req.body || {};

    const validUser =
        typeof username === 'string' &&
        username === USERNAME;

    const validPassword =
        typeof password === 'string' &&
        password === PASSWORD;

    if (!validUser || !validPassword) {
        recent.push(now);
        loginAttempts.set(ip, recent);

        return res.status(401).json({
            success: false,
            message: 'Incorrect username or password'
        });
    }

    loginAttempts.delete(ip);

    res.cookie(COOKIE_NAME, createToken(), {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: TOKEN_LIFETIME,
        path: '/'
    });

    res.json({ success: true, message: 'Login successful' });
});

router.get('/me', requireAdmin, (req, res) => {
    res.json({ success: true, username: USERNAME });
});

router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        path: '/'
    });

    res.json({ success: true });
});

router.get('/sessions', requireAdmin, (req, res) => {
    try {
        const sessions = listSavedSessionIds()
            .filter(isPortalSession)
            .map(id => ({
                id,
                phone: getPhoneNumber(id),
                connected: Boolean(isConnected(id))
            }));

        res.json({
            success: true,
            total: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Admin sessions error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not load sessions'
        });
    }
});

router.delete('/sessions/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;

    if (!isPortalSession(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid session ID'
        });
    }

    try {
        const saved = listSavedSessionIds();

        if (!saved.includes(id)) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        await removeSession(id);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        console.error('Admin delete error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Could not delete session'
        });
    }
});

module.exports = router;
