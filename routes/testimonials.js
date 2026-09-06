import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';
import { getCollection } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '../data/db.json');

const router = express.Router();

function syncTestimonialToLocalDb(action, item) {
  try {
    if (!fs.existsSync(DB_JSON_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    if (!Array.isArray(parsed.testimonials)) parsed.testimonials = [];

    if (action === 'insert') {
      const exists = parsed.testimonials.some(t => t.id === item.id);
      if (!exists) parsed.testimonials.push(item);
    } else if (action === 'update') {
      const idx = parsed.testimonials.findIndex(t => t.id === item.id);
      if (idx !== -1) {
        parsed.testimonials[idx] = { ...parsed.testimonials[idx], ...item };
      }
    } else if (action === 'delete') {
      parsed.testimonials = parsed.testimonials.filter(t => t.id !== item.id && String(t._id) !== String(item.id));
    }

    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.warn('Sync testimonial to local db.json note:', e.message);
  }
}

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
    syncTestimonialToLocalDb('insert', newTesti);
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

    const query = { $or: [{ id: id }] };
    if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });

    await col.updateOne(query, { $set: updateData });
    const updated = await col.findOne(query);

    syncTestimonialToLocalDb('update', { id, ...updateData });

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
    
    const query = { $or: [{ id: id }] };
    if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });

    const result = await col.deleteOne(query);
    syncTestimonialToLocalDb('delete', { id });

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
