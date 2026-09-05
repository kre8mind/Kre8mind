import express from 'express';
import { getCollection } from '../db/mongodb.js';

const router = express.Router();

// GET all journal posts
router.get('/', async (req, res) => {
  try {
    const col = await getCollection('journal');
    const list = await col.find({}).sort({ createdAt: -1 }).toArray();
    const sanitized = list.map(item => {
      const { _id, ...rest } = item;
      return { id: item.id || String(_id), ...rest };
    });
    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      articles: sanitized
    });
  } catch (err) {
    console.error('Error fetching journal:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch journal' });
  }
});

// GET single journal post
router.get('/:id', async (req, res) => {
  try {
    const col = await getCollection('journal');
    const post = await col.findOne({ id: req.params.id });
    if (!post) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    const { _id, ...clean } = post;
    res.json({ success: true, article: clean });
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch article' });
  }
});

// POST create journal post
router.post('/', async (req, res) => {
  try {
    const { title, category, readTime, snippet, content, image } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }

    const col = await getCollection('journal');
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const now = new Date();
    const dateString = `${months[now.getMonth()]} ${now.getFullYear()}`;

    const newPost = {
      id: `post_${Date.now()}`,
      title: title.trim(),
      category: (category || 'DESIGN PHILOSOPHY').toUpperCase(),
      readTime: readTime || '5 MIN READ',
      date: dateString,
      image: image || 'assets/showcase/journal-1.jpg',
      snippet: snippet || content.substring(0, 140) + '...',
      content: content.trim(),
      createdAt: now.toISOString()
    };

    await col.insertOne({ ...newPost });
    res.status(201).json({ success: true, data: newPost, article: newPost });
  } catch (err) {
    console.error('Error creating journal post:', err);
    res.status(500).json({ success: false, error: 'Failed to create article' });
  }
});

// PUT update journal post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection('journal');

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await col.updateOne({ id: id }, { $set: updateData });
    const updated = await col.findOne({ id: id });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    const { _id, ...clean } = updated;
    res.json({ success: true, article: clean });
  } catch (err) {
    console.error('Error updating journal post:', err);
    res.status(500).json({ success: false, error: 'Failed to update article' });
  }
});

// DELETE journal post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection('journal');
    const result = await col.deleteOne({ id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err) {
    console.error('Error deleting journal post:', err);
    res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
});

export default router;
