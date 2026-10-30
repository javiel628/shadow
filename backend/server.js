'use strict';

/*
╔══════════════════════════╗
║       SHADOW PAIR API    ║
║  Integrated with SHADOW MD session manager
║  Developer: 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝚫
╚══════════════════════════╝
*/
require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const {
  startSession,
  removeSession,
  isConnected,
  listSavedSessionIds,
} = require('../src/session');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REQUEST_TTL_MS = 3 * 60 * 1000;
const REQUEST_RETENTION_MS = 10 * 60 * 1000;
const MAX_ACTIVE_REQUESTS = 8;
const requests = new Map();
const ipWindows = new Map();
const cookieParser = require('cookie-parser');
const adminRouter = require('./admin');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: false, limit: '4kb' }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

function jsonError(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

function allowRequest(req) {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const record = ipWindows.get(ip) || { start: now, count: 0 };
  if (now - record.start > 10 * 60 * 1000) {
    record.start = now;
    record.count = 0;
  }
  record.count += 1;
  ipWindows.set(ip, record);
  return record.count <= 5;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SHADOW PAIR', status: 'online' });
});

app.post('/api/pair', async (req, res) => {
  if (!allowRequest(req)) return jsonError(res, 429, 'Too many requests. Please wait before trying again.');

  const number = String(req.body?.number || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(number) || number.startsWith('0')) {
    return jsonError(res, 400, 'Enter a valid international number with country code, digits only.');
  }

  const active = [...requests.values()].filter((r) => !['connected', 'error', 'expired'].includes(r.status));
  if (active.length >= MAX_ACTIVE_REQUESTS) {
    return jsonError(res, 503, 'Pairing is busy right now. Please try again shortly.');
  }

  const requestId = crypto.randomUUID();
  const sessionId = `web_${crypto.randomBytes(16).toString('hex')}`;
  const item = {
    requestId,
    sessionId,
    status: 'starting',
    code: null,
    message: 'Starting a secure WhatsApp pairing session…',
    createdAt: Date.now(),
    expiresAt: Date.now() + REQUEST_TTL_MS,
    number, // kept only in server memory; never returned or logged
  };
  requests.set(requestId, item);

  res.status(202).json({ ok: true, requestId, message: 'Pairing request started.' });

  try {
    await startSession(sessionId, {
      pairingNumber: number,
      onPairingCode: (code) => {
        item.code = String(code);
        item.status = 'code_ready';
        item.message = 'Enter this code in WhatsApp Linked Devices. It is temporary.';
      },
      onPairingError: (err) => {
        item.status = 'error';
        item.code = null;
        item.message = /429|rate/i.test(String(err?.message))
          ? 'WhatsApp is temporarily rate-limiting pairing. Wait before trying again.'
          : 'WhatsApp could not issue a pairing code. Check the number and try again later.';
        removeSession(sessionId).catch(() => {});
      },
      onPairingFailed: () => {
        item.status = 'error';
        item.code = null;
        item.message = 'Pairing was not completed. Start a new request to try again.';
      },
      onConnected: () => {
        item.status = 'connected';
        item.code = null;
        item.message = 'WhatsApp connected successfully. Your SHADOW MD session is online.';
      },
      onLoggedOut: () => {
        item.status = 'error';
        item.code = null;
        item.message = 'This WhatsApp session was logged out.';
      },
      onReplaced: () => {
        item.status = 'error';
        item.code = null;
        item.message = 'This session was opened elsewhere. Close the other connection and retry.';
      },
    });
  } catch (err) {
    item.status = 'error';
    item.code = null;
    item.message = 'Could not start the WhatsApp session. Check the server logs.';
    // Do not log phone numbers, pairing codes, or credentials.
    console.error('[SHADOW PAIR] Session start failed:', err?.message || 'unknown error');
  }
});

app.get('/api/status/:requestId', (req, res) => {
  const item = requests.get(req.params.requestId);
  if (!item) return jsonError(res, 404, 'Pairing request not found or expired.');

  if (item.status !== 'connected' && item.status !== 'error' && Date.now() > item.expiresAt) {
    item.status = 'expired';
    item.code = null;
    item.message = 'This pairing request expired. Start again to get a new code.';
    removeSession(item.sessionId).catch(() => {});
  } else if (isConnected(item.sessionId)) {
    item.status = 'connected';
    item.code = null;
    item.message = 'WhatsApp connected successfully. Your SHADOW MD session is online.';
  }

  res.json({
    ok: true,
    status: item.status,
    code: item.status === 'code_ready' ? item.code : null,
    message: item.message,
    expiresAt: item.expiresAt,
  });
});

// Restore previously paired sessions after a Render restart (requires persistent storage).
async function restoreSessions() {
  const saved = listSavedSessionIds();
  for (const sessionId of saved) {
    try {
      await startSession(sessionId, { restored: true });
      console.log(`[SHADOW PAIR] Restoring saved session ${sessionId.slice(0, 8)}…`);
    } catch (err) {
      console.error(`[SHADOW PAIR] Could not restore session ${sessionId.slice(0, 8)}:`, err.message);
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, item] of requests) {
    if (item.status !== 'connected' && item.status !== 'error' && item.status !== 'expired' && now > item.expiresAt) {
      item.status = 'expired';
      item.code = null;
      item.message = 'This pairing request expired.';
      removeSession(item.sessionId).catch(() => {});
    }
    if (now - item.createdAt > REQUEST_RETENTION_MS) requests.delete(id);
  }
  for (const [ip, record] of ipWindows) {
    if (now - record.start > 20 * 60 * 1000) ipWindows.delete(ip);
  }
}, 30 * 1000).unref();

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[SHADOW PAIR] Request error:', err?.message || 'unknown error');
  if (res.headersSent) return;
  jsonError(res, 500, 'Unexpected server error. Please try again later.');
});

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[SHADOW PAIR] Website and API listening on port ${PORT}`);
  await restoreSessions();
});

process.on('SIGTERM', () => {
  console.log('[SHADOW PAIR] Shutting down web server…');
  server.close(() => process.exit(0));
});
