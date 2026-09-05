import express from 'express';
import { getCollection } from '../db/mongodb.js';

const router = express.Router();

// GET all testimonials
router.get('/', async (req, res) => {
  try {
    const col = await getCollection('testimonials');
    const list = await col.find({}).sort({ order: 1, createdAt: -1 }).toArray();
    const sanitized = list.map(item => {
      const { _id, ...rest } = item;
      return { id: item.id || String(_id), ...rest };
    });
    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      testimonials: sanitized
    });
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch testimonials' });
  }
});

// POST create testimonial
router.post('/', async (req, res) => {
  try {
    const { name, role, company, quote, avatar } = req.body;
    if (!name || !quote) {
      return res.status(400).json({ success: false, error: 'Client name and quote are required.' });
    }

    const col = await getCollection('testimonials');
    const count = await col.countDocuments();

    const newTesti = {
      id: `testi_${Date.now()}`,
      name: name.trim(),
      role: (role || '').trim(),
      company: (company || '').trim(),
      quote: quote.trim(),
      avatar: avatar || 'assets/clients/Tife Ojo Consults.png',
      order: count + 1,
      createdAt: new Date().toISOString()
    };

    await col.insertOne({ ...newTesti });
    res.status(201).json({ success: true, data: newTesti, testimonial: newTesti });
  } catch (err) {
    console.error('Error creating testimonial:', err);
    res.status(500).json({ success: false, error: 'Failed to create testimonial' });
  }
});

// PUT update testimonial
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection('testimonials');
    
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await col.updateOne({ id: id }, { $set: updateData });
    const updated = await col.findOne({ id: id });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Testimonial not found.' });
    }

    const { _id, ...clean } = updated;
    res.json({ success: true, data: clean, testimonial: clean });
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.status(500).json({ success: false, error: 'Failed to update testimonial' });
  }
});

// DELETE testimonial
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection('testimonials');
    const result = await col.deleteOne({ id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Testimonial not found.' });
    }

    res.json({ success: true, message: 'Testimonial deleted successfully.' });
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.status(500).json({ success: false, error: 'Failed to delete testimonial' });
  }
});

export default router;
