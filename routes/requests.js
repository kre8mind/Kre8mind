import express from 'express';
import { getCollection } from '../db/mongodb.js';
import { sendInquiryConfirmation } from '../utils/mailer.js';

const router = express.Router();

// GET all inquiries (for Admin Dashboard)
router.get('/', async (req, res) => {
  try {
    const col = await getCollection('inquiries');
    const list = await col.find({}).sort({ createdAt: -1 }).toArray();
    const sanitized = list.map(item => {
      const { _id, ...rest } = item;
      return { id: item.id || String(_id), ...rest };
    });
    res.json({
      success: true,
      count: sanitized.length,
      inquiries: sanitized
    });
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch inquiries' });
  }
});

// POST new client inquiry from frontend services/contact forms
router.post('/', async (req, res) => {
  try {
    const { name, email, company, serviceTier, addons, budget, timeline, details } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required fields.'
      });
    }

    const col = await getCollection('inquiries');
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
      status: 'NEW'
    };

    await col.insertOne({ ...newInquiry });

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

    const col = await getCollection('inquiries');
    await col.updateOne(
      { id: id },
      { $set: { status: status, updatedAt: new Date().toISOString() } }
    );

    const updated = await col.findOne({ id: id });
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Inquiry not found.' });
    }

    const { _id, ...clean } = updated;
    res.json({ success: true, inquiry: clean });
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE inquiry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection('inquiries');
    const result = await col.deleteOne({ id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    res.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting inquiry:', err);
    res.status(500).json({ success: false, error: 'Failed to delete inquiry' });
  }
});

export default router;
