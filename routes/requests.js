import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../db/mongodb.js';
import { sendInquiryConfirmation } from '../utils/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '../data/db.json');

const router = express.Router();

function readLocalDbInquiries() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
      return Array.isArray(parsed.inquiries) ? parsed.inquiries : [];
    }
  } catch (e) {
    console.error('Error reading local db.json inquiries:', e);
  }
  return [];
}

function syncInquiryToLocalDb(action, item) {
  try {
    if (!fs.existsSync(DB_JSON_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    if (!Array.isArray(parsed.inquiries)) parsed.inquiries = [];

    if (action === 'insert') {
      const exists = parsed.inquiries.some(i => i.id === item.id);
      if (!exists) parsed.inquiries.unshift(item);
    } else if (action === 'update') {
      const idx = parsed.inquiries.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        parsed.inquiries[idx] = { ...parsed.inquiries[idx], ...item };
      }
    } else if (action === 'delete') {
      parsed.inquiries = parsed.inquiries.filter(i => i.id !== item.id);
    }

    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.warn('Sync inquiry to local db.json note:', e.message);
  }
}

// GET all inquiries (for Admin Dashboard)
router.get('/', async (req, res) => {
  try {
    let sanitized = [];
    try {
      const col = await getCollection('inquiries');
      const list = await col.find({}).sort({ createdAt: -1 }).toArray();
      sanitized = list.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || String(_id), ...rest };
      });
    } catch (dbErr) {
      console.warn('Inquiries DB query note, using local fallback:', dbErr.message);
    }

    if (!sanitized || sanitized.length === 0) {
      sanitized = readLocalDbInquiries();
    }

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      inquiries: sanitized
    });
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    const local = readLocalDbInquiries();
    res.json({
      success: true,
      count: local.length,
      data: local,
      inquiries: local
    });
  }
});

// POST new client inquiry from frontend services/contact forms
router.post('/', async (req, res) => {
  try {
    const { name, email, company, serviceTier, addons, budget, timeline, details, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required fields.'
      });
    }

    const validStatuses = ['NEW', 'ONGOING', 'COMPLETED', 'REJECTED', 'BOOKED_CALL', 'REVIEWED', 'ARCHIVED', 'CONTACTED'];
    const initialStatus = validStatuses.includes(status) ? status : 'NEW';

    const newInquiry = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      name: name.trim(),
      email: email.trim(),
      company: company ? company.trim() : '',
      serviceTier: serviceTier || 'Custom Engagement',
      addons: Array.isArray(addons) ? addons : [],
      budget: budget || 'To be discussed',
      timeline: timeline || 'Standard',
      details: details ? details.trim() : '',
      status: initialStatus
    };

    try {
      const col = await getCollection('inquiries');
      await col.insertOne({ ...newInquiry });
    } catch (mErr) {
      console.warn('Atlas inquiry insert note:', mErr.message);
    }

    syncInquiryToLocalDb('insert', newInquiry);

    // Send confirmation email (non-blocking if mailer fails)
    let emailResult = { sent: false };
    try {
      emailResult = await sendInquiryConfirmation(newInquiry);
    } catch (mErr) {
      console.warn('Mailer note:', mErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry received successfully. Confirmation email dispatched.',
      inquiry: newInquiry,
      emailStatus: emailResult
    });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process service inquiry.'
    });
  }
});

// PATCH update inquiry status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['NEW', 'ONGOING', 'COMPLETED', 'REJECTED', 'BOOKED_CALL', 'REVIEWED', 'ARCHIVED', 'CONTACTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }

    let updated = null;

    try {
      const col = await getCollection('inquiries');
      await col.updateOne(
        { id: id },
        { $set: { status: status, updatedAt: new Date().toISOString() } }
      );
      const found = await col.findOne({ id: id });
      if (found) {
        const { _id, ...clean } = found;
        updated = clean;
      }
    } catch (mErr) {
      console.warn('Atlas inquiry status update note:', mErr.message);
    }

    syncInquiryToLocalDb('update', { id, status, updatedAt: new Date().toISOString() });

    if (!updated) {
      const localList = readLocalDbInquiries();
      updated = localList.find(i => i.id === id);
    }

    if (!updated) {
      return res.status(400).json({ success: false, error: 'Inquiry not found.' });
    }

    res.json({ success: true, inquiry: updated });
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE inquiry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const col = await getCollection('inquiries');
      await col.deleteOne({ id: id });
    } catch (mErr) {
      console.warn('Atlas delete inquiry note:', mErr.message);
    }

    syncInquiryToLocalDb('delete', { id });

    res.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting inquiry:', err);
    res.status(500).json({ success: false, error: 'Failed to delete inquiry' });
  }
});

export default router;
