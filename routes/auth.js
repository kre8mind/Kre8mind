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
  const cleanPayload = { ...payload, ts: Date.now() };
  const b64Data = Buffer.from(JSON.stringify(cleanPayload), 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_SALT).update(b64Data).digest('hex');
  return `${b64Data}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    // 1. Format: b64Data.signature
    const dotIndex = token.indexOf('.');
    if (dotIndex !== -1) {
      const b64Data = token.substring(0, dotIndex);
      const signature = token.substring(dotIndex + 1);
      const expectedSig = crypto.createHmac('sha256', SECRET_SALT).update(b64Data).digest('hex');
      if (signature === expectedSig) {
        const rawJson = Buffer.from(b64Data, 'base64url').toString('utf-8');
        const parsed = JSON.parse(rawJson);
        // Token valid for 30 days
        if (Date.now() - parsed.ts < 30 * 24 * 60 * 60 * 1000) {
          return true;
        }
      }
    }

    // 2. Backward compatibility fallback for legacy tokens
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const lastDot = raw.lastIndexOf('.');
    if (lastDot !== -1) {
      const dataStr = raw.substring(0, lastDot);
      const signature = raw.substring(lastDot + 1);
      const expectedHmac = crypto.createHmac('sha256', SECRET_SALT).update(dataStr).digest('hex');
      if (signature === expectedHmac) {
        const parsed = JSON.parse(dataStr);
        if (Date.now() - parsed.ts < 30 * 24 * 60 * 60 * 1000) {
          return true;
        }
      }
    }

    return false;
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
router.post('/change-password', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];
  const hasValidToken = verifyAdminToken(token);

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long.'
    });
  }

  const settings = await getStudioSettings();
  const configuredPassword = settings.adminPassword || process.env.ADMIN_PASSWORD || 'kre8mind2026';

  // If session token is missing or expired, require and verify the current password
  if (!hasValidToken) {
    if (!currentPassword || currentPassword.trim() !== configuredPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect current password. Please enter your valid current password to update it.'
      });
    }
  } else {
    // If valid token is present, only check currentPassword if user entered one
    if (currentPassword && currentPassword.trim() !== '' && currentPassword.trim() !== configuredPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password does not match.'
      });
    }
  }

  const trimmedNew = newPassword.trim();
  await updateStudioSettings({ adminPassword: trimmedNew });
  process.env.ADMIN_PASSWORD = trimmedNew;

  // Issue fresh session token with new password
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const newToken = generateToken({ role: 'admin', ip: String(ip).substring(0, 8) });

  res.json({
    success: true,
    message: 'Studio password successfully updated.',
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
