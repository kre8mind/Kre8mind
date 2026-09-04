import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET all journal posts
router.get('/', (req, res) => {
  const data = db.read();
  res.json({
    success: true,
    count: (data.journal || []).length,
    data: data.journal || [],
    articles: data.journal || []
  });
});

// GET single journal post
router.get('/:id', (req, res) => {
  const data = db.read();
  const post = data.journal.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }
  res.json({ success: true, article: post });
});

// POST create journal post
router.post('/', (req, res) => {
  const { title, category, readTime, snippet, content, image } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Title and content are required.' });
  }

  const data = db.read();
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

  data.journal.unshift(newPost);
  db.write(data);
  res.status(201).json({ success: true, data: newPost, article: newPost });
});

// PUT update journal post
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const index = data.journal.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }

  data.journal[index] = {
    ...data.journal[index],
    ...req.body,
    id: id
  };

  db.write(data);
  res.json({ success: true, article: data.journal[index] });
});

// DELETE journal post
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const initialLength = data.journal.length;
  data.journal = data.journal.filter(p => p.id !== id);

  if (data.journal.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }

  db.write(data);
  res.json({ success: true, message: 'Article deleted successfully.' });
});

export default router;
