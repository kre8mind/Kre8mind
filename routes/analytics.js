import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '../data/db.json');

const router = express.Router();

function readLocalDbAnalytics() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
      return {
        analytics: Array.isArray(parsed.analytics) ? parsed.analytics : [],
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : []
      };
    }
  } catch (e) {
    console.error('Error reading local db.json analytics:', e);
  }
  return { analytics: [], inquiries: [] };
}

// Helper to hash IP for privacy-friendly unique visitor tracking
function anonymizeIp(ip) {
  if (!ip) return 'anon';
  return crypto.createHash('sha256').update(ip + '_kre8salt').digest('hex').substring(0, 12);
}

// 1. Record Page Visit
router.post('/track', async (req, res) => {
  try {
    const { path: rawPath = '/', referrer = '', device = 'Desktop', screenWidth = 1440 } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const visitorId = anonymizeIp(ip);
    const userAgent = req.headers['user-agent'] || '';

    let detectedDevice = device;
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) || screenWidth < 768) {
      detectedDevice = 'Mobile';
    } else if (screenWidth < 1024) {
      detectedDevice = 'Tablet';
    } else {
      detectedDevice = 'Desktop';
    }

    const newVisit = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      visitorId,
      path: (rawPath.split('?')[0] || '/').replace(/^\/+/, '') || 'home',
      referrer: referrer ? (function() { try { return new URL(referrer).hostname; } catch { return 'Direct'; } })() : 'Direct',
      device: detectedDevice,
      createdAt: new Date().toISOString()
    };

    try {
      const col = await getCollection('analytics');
      await col.insertOne(newVisit);
    } catch (mErr) {
      console.warn('Atlas analytics track note:', mErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Analytics track error:', err);
    res.status(500).json({ success: false, error: 'Failed to record analytics' });
  }
});

// 2. Get Analytics Overview & Time-series data
router.get('/overview', async (req, res) => {
  try {
    let visits = [];
    let inquiries = [];

    try {
      const analyticsCol = await getCollection('analytics');
      const inqCol = await getCollection('inquiries');
      visits = await analyticsCol.find({}).sort({ createdAt: -1 }).limit(1000).toArray();
      inquiries = await inqCol.find({}).sort({ createdAt: -1 }).toArray();
    } catch (dbErr) {
      console.warn('Analytics DB query note, using local fallback:', dbErr.message);
    }

    if (!visits || visits.length === 0) {
      const local = readLocalDbAnalytics();
      visits = local.analytics;
      if (!inquiries || inquiries.length === 0) {
        inquiries = local.inquiries;
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Seed recent 7 days timeline
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      daysMap[key] = { date: key, label, visits: 0, inquiries: 0, unique: new Set() };
    }

    let visitsToday = 0;
    const uniqueToday = new Set();
    const pageCounts = {};
    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const recentStream = [];

    // Analyze visits
    visits.forEach((v, idx) => {
      const dateKey = (v.createdAt || '').split('T')[0];
      
      if (dateKey === todayStr) {
        visitsToday++;
        uniqueToday.add(v.visitorId);
      }

      if (daysMap[dateKey]) {
        daysMap[dateKey].visits++;
        daysMap[dateKey].unique.add(v.visitorId);
      }

      // Page counts
      const p = v.path || 'home';
      pageCounts[p] = (pageCounts[p] || 0) + 1;

      // Device counts
      const dev = v.device || 'Desktop';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;

      // Recent 10 stream
      if (idx < 10) {
        recentStream.push({
          id: v.id || String(v._id),
          path: v.path,
          device: v.device,
          referrer: v.referrer,
          time: v.createdAt
        });
      }
    });

    // Analyze inquiries per day
    inquiries.forEach(inq => {
      const inqDate = (inq.createdAt || '').split('T')[0];
      if (daysMap[inqDate]) {
        daysMap[inqDate].inquiries++;
      }
    });

    const timeline = Object.values(daysMap).map(d => ({
      date: d.date,
      label: d.label,
      visits: d.visits,
      uniqueVisitors: d.unique.size,
      inquiries: d.inquiries
    }));

    // Top pages
    const topPages = Object.entries(pageCounts)
      .map(([pagePath, count]) => ({ path: pagePath, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalVisits = visits.length;
    const totalInquiries = inquiries.length;
    const conversionRate = totalVisits > 0 ? ((totalInquiries / totalVisits) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        totalVisits,
        visitsToday,
        uniqueToday: uniqueToday.size,
        totalInquiries,
        conversionRate,
        timeline,
        topPages,
        deviceCounts,
        recentStream
      }
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
  }
});

export default router;
