import express from 'express';
import { db } from '../db/database.js';
import { sendInquiryConfirmation } from '../services/mailer.js';

const router = express.Router();

// GET all inquiries (for Admin Dashboard)
router.get('/', (req, res) => {
  const data = db.read();
  res.json({
    success: true,
    count: data.inquiries.length,
    inquiries: data.inquiries
  });
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

    const data = db.read();
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

    data.inquiries.unshift(newInquiry);
    db.write(data);

    // Send confirmation email
    const emailResult = await sendInquiryConfirmation(newInquiry);

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
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['NEW', 'ONGOING', 'COMPLETED', 'REJECTED', 'BOOKED_CALL', 'REVIEWED', 'ARCHIVED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const data = db.read();
  const inquiry = data.inquiries.find(item => item.id === id);

  if (!inquiry) {
    return res.status(400).json({ success: false, error: 'Inquiry not found.' });
  }

  inquiry.status = status;
  inquiry.updatedAt = new Date().toISOString();
  db.write(data);

  res.json({ success: true, inquiry });
});

// DELETE inquiry
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const initialLength = data.inquiries.length;
  data.inquiries = data.inquiries.filter(item => item.id !== id);

  if (data.inquiries.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Inquiry not found.' });
  }

  db.write(data);
  res.json({ success: true, message: 'Inquiry deleted successfully.' });
});

export default router;
