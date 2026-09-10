import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '../data/db.json');

const router = express.Router();

function readLocalDbJournal() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
      return Array.isArray(parsed.journal) ? parsed.journal : [];
    }
  } catch (e) {
    console.error('Error reading local db.json journal:', e);
  }
  return [];
}

function syncJournalToLocalDb(action, article) {
  try {
    if (!fs.existsSync(DB_JSON_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    if (!Array.isArray(parsed.journal)) parsed.journal = [];

    if (action === 'insert') {
      const exists = parsed.journal.some(a => a.id === article.id);
      if (!exists) parsed.journal.unshift(article);
    } else if (action === 'update') {
      const idx = parsed.journal.findIndex(a => a.id === article.id);
      if (idx !== -1) {
        parsed.journal[idx] = { ...parsed.journal[idx], ...article };
      }
    } else if (action === 'delete') {
      parsed.journal = parsed.journal.filter(a => a.id !== article.id);
    }

    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.warn('Sync journal to local db.json note:', e.message);
  }
}

// GET all journal posts
router.get('/', async (req, res) => {
  try {
    let sanitized = [];
    try {
      const col = await getCollection('journal');
      const list = await col.find({}).sort({ createdAt: -1 }).toArray();
      sanitized = list.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || String(_id), ...rest };
      });
    } catch (dbErr) {
      console.warn('Journal DB query warning, checking local fallback:', dbErr.message);
    }

    // Fallback to local db if Atlas empty or unreachable
    if (!sanitized || sanitized.length === 0) {
      sanitized = readLocalDbJournal();
    }

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      articles: sanitized
    });
  } catch (err) {
    console.error('Error fetching journal:', err);
    const local = readLocalDbJournal();
    res.json({
      success: true,
      count: local.length,
      data: local,
      articles: local
    });
  }
});

// GET single journal post
router.get('/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const cleanId = String(rawId).trim().toLowerCase();
    let cleanPost = null;

    // 1. Try MongoDB
    try {
      const col = await getCollection('journal');
      const post = await col.findOne({
        $or: [
          { id: rawId },
          { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { title: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      });
      if (post) {
        const { _id, ...rest } = post;
        cleanPost = { id: post.id || String(_id), ...rest };
      }
    } catch (dbErr) {
      console.warn('MongoDB journal lookup note:', dbErr.message);
    }

    // 2. Try Local fallback if not found
    if (!cleanPost) {
      const localList = readLocalDbJournal();
      const match = localList.find(a => 
        (a.id && a.id.toLowerCase() === cleanId) ||
        (a.id === rawId) ||
        (a.title && a.title.toLowerCase() === cleanId) ||
        (a.title && a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanId)
      );
      if (match) cleanPost = match;
    }

    if (!cleanPost) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    res.json({ success: true, article: cleanPost, data: cleanPost });
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

    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const now = new Date();
    const dateString = `${months[now.getMonth()]} ${now.getFullYear()}`;

    // Calculate approx read time if omitted
    const wordCount = content.trim().split(/\s+/).length;
    const computedReadTime = readTime || `${Math.max(1, Math.round(wordCount / 180))} MIN READ`;
    const cleanSnippet = snippet || content.replace(/<[^>]*>?/gm, '').substring(0, 160).trim() + '...';

    const newPost = {
      id: `post_${Date.now()}`,
      title: title.trim(),
      category: (category || 'DESIGN PHILOSOPHY').toUpperCase(),
      readTime: computedReadTime,
      date: dateString,
      image: image || 'assets/showcase/journal-1.jpg',
      snippet: cleanSnippet,
      content: content.trim(),
      createdAt: now.toISOString()
    };

    try {
      const col = await getCollection('journal');
      await col.insertOne({ ...newPost });
    } catch (mErr) {
      console.warn('Atlas insert note:', mErr.message);
    }

    syncJournalToLocalDb('insert', newPost);

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
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    delete updateData._id;
    delete updateData.id;

    let updated = null;

    try {
      const col = await getCollection('journal');
      await col.updateOne({ id: id }, { $set: updateData });
      const found = await col.findOne({ id: id });
      if (found) {
        const { _id, ...clean } = found;
        updated = clean;
      }
    } catch (mErr) {
      console.warn('Atlas update note:', mErr.message);
    }

    syncJournalToLocalDb('update', { id, ...updateData });

    if (!updated) {
      const localList = readLocalDbJournal();
      updated = localList.find(a => a.id === id);
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    res.json({ success: true, article: updated, data: updated });
  } catch (err) {
    console.error('Error updating journal post:', err);
    res.status(500).json({ success: false, error: 'Failed to update article' });
  }
});

// DELETE journal post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const col = await getCollection('journal');
      await col.deleteOne({ id: id });
    } catch (mErr) {
      console.warn('Atlas delete note:', mErr.message);
    }

    syncJournalToLocalDb('delete', { id });

    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err) {
    console.error('Error deleting journal post:', err);
    res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
});

export default router;
