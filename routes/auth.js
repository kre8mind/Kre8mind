import express from 'express';
import crypto from 'crypto';
import { getStudioSettings, updateStudioSettings } from '../db/mongodb.js';

const router = express.Router();

// Memory store for brute-force rate limiting
const loginAttempts = new Map();

// Helper to clean old attempts
function getIpAttempts(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  if (record.lockUntil && now > record.lockUntil) {
    record.count = 0;
    record.lockUntil = 0;
  }
  return record;
}

// Generate secure session token with HMAC
const SECRET_SALT = process.env.SESSION_SECRET || 'kre8mind_studio_super_secret_key_2026';

export function generateToken(payload = {}) {
  const dataStr = JSON.stringify({ ...payload, ts: Date.now() });
  const hmac = crypto.createHmac('sha256', SECRET_SALT).update(dataStr).digest('hex');
  return Buffer.from(`${dataStr}.${hmac}`).toString('base64');
}

export function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const [dataStr, signature] = raw.split('.');
    if (!dataStr || !signature) return false;

    const expectedHmac = crypto.createHmac('sha256', SECRET_SALT).update(dataStr).digest('hex');
    if (signature !== expectedHmac) return false;

    const parsed = JSON.parse(dataStr);
    // Token valid for 7 days
    if (Date.now() - parsed.ts > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Middleware to guard admin endpoints
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];

  if (!verifyAdminToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Admin authentication token missing or expired.'
    });
  }
  next();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const attempts = getIpAttempts(ip);

  // Check lockout
  if (attempts.lockUntil && Date.now() < attempts.lockUntil) {
    const waitMins = Math.ceil((attempts.lockUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Access locked. Please try again in ${waitMins} minute(s).`
    });
  }

  const settings = await getStudioSettings();
  const configuredPassword = settings.adminPassword || process.env.ADMIN_PASSWORD || 'kre8mind2026';

  if (!password || password !== configuredPassword) {
    attempts.count += 1;
    if (attempts.count >= 5) {
      attempts.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
    }
    loginAttempts.set(ip, attempts);

    const remaining = Math.max(0, 5 - attempts.count);
    return res.status(401).json({
      success: false,
      error: remaining > 0 
        ? `Invalid password. ${remaining} attempt(s) remaining before temporary lockout.`
        : 'Too many failed attempts. Access temporarily locked for 15 minutes.'
    });
  }

  // Success - reset attempts
  loginAttempts.delete(ip);

  // Issue secure signed session token
  const token = generateToken({ role: 'admin', ip: String(ip).substring(0, 8) });

  res.json({
    success: true,
    message: 'Authenticated successfully.',
    token: token
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAdminAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long.'
    });
  }

  const settings = await getStudioSettings();
  const currentConfigured = settings.adminPassword || process.env.ADMIN_PASSWORD || 'kre8mind2026';

  // If user provided a current password, verify it matches
  if (currentPassword && currentPassword.trim() !== '' && currentPassword !== currentConfigured) {
    return res.status(400).json({
      success: false,
      error: 'Current password does not match.'
    });
  }

  const trimmedNew = newPassword.trim();
  await updateStudioSettings({ adminPassword: trimmedNew });
  process.env.ADMIN_PASSWORD = trimmedNew;

  // Issue fresh session token with new password
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const newToken = generateToken({ role: 'admin', ip: String(ip).substring(0, 8) });

  res.json({
    success: true,
    message: 'Admin password successfully updated.',
    token: newToken
  });
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];

  const valid = verifyAdminToken(token);
  res.json({ success: valid, authenticated: valid });
});

export default router;
