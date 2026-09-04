import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET all testimonials
router.get('/', (req, res) => {
  const data = db.read();
  const sorted = [...(data.testimonials || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({
    success: true,
    count: sorted.length,
    data: sorted,
    testimonials: sorted
  });
});

// POST create testimonial
router.post('/', (req, res) => {
  const { name, role, company, quote, avatar } = req.body;
  if (!name || !quote) {
    return res.status(400).json({ success: false, error: 'Client name and quote are required.' });
  }

  const data = db.read();
  if (!Array.isArray(data.testimonials)) data.testimonials = [];

  const newTesti = {
    id: `testi_${Date.now()}`,
    name: name.trim(),
    role: (role || '').trim(),
    company: (company || '').trim(),
    quote: quote.trim(),
    avatar: avatar || 'assets/clients/Tife Ojo Consults.png',
    order: data.testimonials.length + 1,
    createdAt: new Date().toISOString()
  };

  data.testimonials.push(newTesti);
  db.write(data);
  res.status(201).json({ success: true, data: newTesti, testimonial: newTesti });
});

// PUT update testimonial
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const index = (data.testimonials || []).findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Testimonial not found.' });
  }

  data.testimonials[index] = {
    ...data.testimonials[index],
    ...req.body,
    id: id
  };

  db.write(data);
  res.json({ success: true, data: data.testimonials[index], testimonial: data.testimonials[index] });
});

// DELETE testimonial
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const initialLength = (data.testimonials || []).length;
  data.testimonials = (data.testimonials || []).filter(t => t.id !== id);

  if (data.testimonials.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Testimonial not found.' });
  }

  db.write(data);
  res.json({ success: true, message: 'Testimonial deleted successfully.' });
});

export default router;
