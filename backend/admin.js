
'use strict';

/*
╔══════════════════════════════════╗
║       SHADOW PAIR ADMIN API      ║
║       Developer: SMILE MODZ      ║
╚══════════════════════════════════╝
*/

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  removeSession,
  isConnected,
  listSavedSessionIds,
} = require('../src/session');

const router = express.Router();

const STORAGE_ROOT = process.env.SHADOW_DATA_DIR || process.cwd();
const AUTH_ROOT = path.join(STORAGE_ROOT, 'session');

const COOKIE_NAME = 'shadow_admin';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const loginAttempts = new Map();

router.use(express.json({ limit: '4kb' }));

function safeCompare(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));

  if (first.length !== second.length) return false;

  return crypto.timingSafeEqual(first, second);
}

function sign(value) {
  return crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(value)
    .digest('hex');
}

function createToken() {
  const expires = Date.now() + COOKIE_MAX_AGE;
  const payload = `${ADMIN_USERNAME}:${expires}`;
  return `${payload}:${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !ADMIN_SECRET) return false;

  const parts = token.split(':');

  if (parts.length !== 3) return false;

  const [username, expires, signature] = parts;
  const payload = `${username}:${expires}`;

  if (username !== ADMIN_USERNAME) return false;
  if (!/^\d+$/.test(expires)) return false;
  if (Date.now() > Number(expires)) return false;

  return safeCompare(signature, sign(payload));
}

function setAdminCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/api/admin',
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
  });
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!verifyToken(token)) {
    return res.status(401).json({
      ok: false,
      error: 'Please log in as administrator.',
    });
  }

  next();
}

function validSessionId(id) {
  return /^web_[a-f0-9]{32}$/.test(String(id));
}

function getPhoneNumber(sessionId) {
  try {
    const credsPath = path.join(
      AUTH_ROOT,
      sessionId,
      'creds.json'
    );

    const creds = JSON.parse(
      fs.readFileSync(credsPath, 'utf8')
    );

    const jid = creds?.me?.id || '';
    const number = String(jid).split('@')[0].split(':')[0];

    return number.replace(/\D/g, '') || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Login.
router.post('/login', (req, res) => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return res.status(503).json({
      ok: false,
      error: 'Admin environment variables are not configured.',
    });
  }

  const ip = String(
    req.ip || req.socket.remoteAddress || 'unknown'
  );

  const now = Date.now();
  const attempt = loginAttempts.get(ip) || {
    count: 0,
    start: now,
  };

  if (now - attempt.start > 15 * 60 * 1000) {
    attempt.count = 0;
    attempt.start = now;
  }

  if (attempt.count >= 5) {
    return res.status(429).json({
      ok: false,
      error: 'Too many login attempts. Try again later.',
    });
  }

  attempt.count += 1;
  loginAttempts.set(ip, attempt);

  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');

  const valid =
    safeCompare(username, ADMIN_USERNAME) &&
    safeCompare(password, ADMIN_PASSWORD);

  if (!valid) {
    return res.status(401).json({
      ok: false,
      error: 'Incorrect username or password.',
    });
  }

  loginAttempts.delete(ip);

  setAdminCookie(res, createToken());

  return res.json({
    ok: true,
    message: 'Administrator login successful.',
  });
});

// Check login status.
router.get('/me', requireAdmin, (_req, res) => {
  res.json({
    ok: true,
    authenticated: true,
    username: ADMIN_USERNAME,
  });
});

// Logout.
router.post('/logout', requireAdmin, (_req, res) => {
  clearAdminCookie(res);

  res.json({
    ok: true,
    message: 'Logged out successfully.',
  });
});

// List saved web pairing sessions.
router.get('/sessions', requireAdmin, (_req, res) => {
  try {
    const sessionIds = listSavedSessionIds()
      .filter(validSessionId);

    const sessions = sessionIds.map((id) => ({
      id,
      number: getPhoneNumber(id),
      connected: Boolean(isConnected(id)),
    }));

    res.json({
      ok: true,
      total: sessions.length,
      connected: sessions.filter((s) => s.connected).length,
      sessions,
    });
  } catch (err) {
    console.error('[SHADOW ADMIN] Session list error:', err);

    res.status(500).json({
      ok: false,
      error: 'Could not load sessions.',
    });
  }
});

// Delete a saved web pairing session.
router.delete('/sessions/:id', requireAdmin, async (req, res) => {
  const sessionId = String(req.params.id || '');

  if (!validSessionId(sessionId)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid session ID.',
    });
  }

  try {
    const sessionPath = path.join(AUTH_ROOT, sessionId);

    if (!fs.existsSync(sessionPath)) {
      return res.status(404).json({
        ok: false,
        error: 'Session not found.',
      });
    }

    await removeSession(sessionId);

    // Remove remaining files if the session manager left the directory.
    fs.rmSync(sessionPath, {
      recursive: true,
      force: true,
    });

    res.json({
      ok: true,
      message: 'Session deleted successfully.',
    });
  } catch (err) {
    console.error('[SHADOW ADMIN] Delete error:', err);

    res.status(500).json({
      ok: false,
      error: 'Could not delete this session.',
    });
  }
});

module.exports = router;
