import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import fs from 'fs';
import { getCollection } from './db/mongodb.js';

import requestsRouter from './routes/requests.js';
import projectsRouter from './routes/projects.js';
import journalRouter from './routes/journal.js';
import authRouter from './routes/auth.js';
import analyticsRouter from './routes/analytics.js';
import testimonialsRouter from './routes/testimonials.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static assets (CSS, JS, Images, Fonts)
app.use(express.static(__dirname, { index: false }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    studio: 'Kre8mind Studio API',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// File Upload (Multer Memory Storage - Serverless & Atlas Safe)
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Serve uploaded media directly from MongoDB Atlas
app.get('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mediaCol = await getCollection('media');
    const item = await mediaCol.findOne({ mediaId: id });
    if (!item || !item.data) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.setHeader('Content-Type', item.mimetype || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const buf = Buffer.isBuffer(item.data) ? item.data : (item.data.buffer ? Buffer.from(item.data.buffer) : Buffer.from(item.data));
    return res.send(buf);
  } catch (err) {
    console.error('Error serving media from Atlas:', err);
    return res.status(500).json({ error: 'Failed to retrieve media' });
  }
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ success: false, error: err.message || 'File upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    try {
      const mediaCol = await getCollection('media');
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await mediaCol.insertOne({
        mediaId,
        filename: req.file.originalname,
        mimetype: req.file.mimetype || 'image/png',
        data: req.file.buffer,
        size: req.file.size,
        createdAt: new Date()
      });
      const filePath = `/api/media/${mediaId}`;
      res.json({ success: true, filePath });
    } catch (dbErr) {
      console.error('Atlas media upload save error:', dbErr);
      res.status(500).json({ success: false, error: 'Failed to save media to database' });
    }
  });
});

app.post('/api/upload-multiple', (req, res) => {
  upload.array('files', 25)(req, res, async (err) => {
    if (err) {
      console.error('Multiple upload error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Files upload failed' });
    }
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    try {
      const mediaCol = await getCollection('media');
      const filePaths = [];
      for (const file of req.files) {
        const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await mediaCol.insertOne({
          mediaId,
          filename: file.originalname,
          mimetype: file.mimetype || 'image/jpeg',
          data: file.buffer,
          size: file.size,
          createdAt: new Date()
        });
        filePaths.push(`/api/media/${mediaId}`);
      }
      res.json({ success: true, filePaths });
    } catch (dbErr) {
      console.error('Atlas multiple media save error:', dbErr);
      res.status(500).json({ success: false, error: 'Failed to save media files' });
    }
  });
});

// API Routes
app.use('/api/requests', requestsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/auth', authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/testimonials', testimonialsRouter);

// Strict 404 for unknown API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Helpers for dynamic OpenGraph & Twitter social preview rendering
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBaseUrl(req) {
  const host = req.get('host') || 'kre8mind.com';
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

function readTemplate(filename) {
  const cwdPath = path.join(process.cwd(), filename);
  if (fs.existsSync(cwdPath)) return fs.readFileSync(cwdPath, 'utf-8');
  const dirPath = path.join(__dirname, filename);
  if (fs.existsSync(dirPath)) return fs.readFileSync(dirPath, 'utf-8');
  return fs.readFileSync(path.resolve(filename), 'utf-8');
}

function renderHtmlWithSocialMeta(filename, meta, req) {
  try {
    let html = readTemplate(filename);
    const baseUrl = getBaseUrl(req);

    let imageUrl = meta.image || '/assets/social-cover.jpg';
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = `${baseUrl}/${imageUrl.replace(/^\/+/, '')}`;
    }

    const title = meta.title || 'Kre8mind - Clarity by Design';
    const description = meta.description || 'Kre8mind is a product design studio for product redesign, websites, and apps, making digital experiences clearer, more useful, and easier to trust.';
    const pageUrl = meta.url || `${baseUrl}${req.originalUrl}`;
    const type = meta.type || 'website';

    // Replace <title>
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

    // Clean out existing meta description, og:, and twitter: tags
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');

    const dynamicMeta = `
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Dynamic OpenGraph & Twitter Social Meta -->
  <meta property="og:site_name" content="Kre8mind">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="${type}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@kre8mind">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">`;

    return html.replace('</head>', `${dynamicMeta}\n</head>`);
  } catch (err) {
    console.error('Error rendering HTML with social meta:', err);
    return readTemplate(filename);
  }
}

async function findProject(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();
  try {
    const col = await getCollection('projects');
    const proj = await col.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { title: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });
    return proj;
  } catch {
    return null;
  }
}

async function findJournalArticle(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();
  try {
    const col = await getCollection('journal');
    const article = await col.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { title: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });
    return article;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Dynamic Social Preview & Page Routes
// --------------------------------------------------------------------------

// Project / Case Study Deep Link Route with Dynamic Social Meta Preview
app.get(['/project/:id', '/case-study/:id'], async (req, res) => {
  const proj = await findProject(req.params.id);
  const baseUrl = getBaseUrl(req);

  if (proj) {
    const meta = {
      title: `${proj.title} — Kre8mind Case Study`,
      description: proj.summary || `Strategic design and product engineering case study for ${proj.title}. Engineered by Kre8mind Studio.`,
      image: proj.image || '/assets/social-cover.jpg',
      url: `${baseUrl}/project/${proj.id}`,
      type: 'article'
    };
    return res.send(renderHtmlWithSocialMeta('projects.html', meta, req));
  }

  // Fallback to general projects
  return res.send(renderHtmlWithSocialMeta('projects.html', {
    title: 'Selected Projects & Case Studies — Kre8mind',
    description: 'Explore selected case studies and digital products crafted by Kre8mind Studio.',
    image: '/assets/social-cover.jpg',
    url: `${baseUrl}/projects`,
    type: 'website'
  }, req));
});

// Projects Page (Supports ?id= or ?project= query for dynamic project share)
app.get('/projects', async (req, res) => {
  const queryId = req.query.id || req.query.project;
  const baseUrl = getBaseUrl(req);

  if (queryId) {
    const proj = await findProject(queryId);
    if (proj) {
      const meta = {
        title: `${proj.title} — Kre8mind Case Study`,
        description: proj.summary || `Strategic design and product engineering case study for ${proj.title}. Engineered by Kre8mind Studio.`,
        image: proj.image || '/assets/social-cover.jpg',
        url: `${baseUrl}/project/${proj.id}`,
        type: 'article'
      };
      return res.send(renderHtmlWithSocialMeta('projects.html', meta, req));
    }
  }

  return res.send(renderHtmlWithSocialMeta('projects.html', {
    title: 'Selected Projects & Case Studies — Kre8mind',
    description: 'Explore selected case studies and digital products crafted by Kre8mind Studio. Engineered for clarity, intuitive ergonomics, and measurable conversion.',
    image: '/assets/social-cover.jpg',
    url: `${baseUrl}/projects`,
    type: 'website'
  }, req));
});

// Journal Article Deep Link Route with Dynamic Social Meta Preview
app.get('/journal/:id', async (req, res) => {
  const article = await findJournalArticle(req.params.id);
  const baseUrl = getBaseUrl(req);

  if (article) {
    const meta = {
      title: `${article.title} — Kre8mind Journal`,
      description: article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
      image: article.image || '/assets/social-cover.jpg',
      url: `${baseUrl}/journal/${article.id}`,
      type: 'article'
    };
    return res.send(renderHtmlWithSocialMeta('journal.html', meta, req));
  }

  return res.send(renderHtmlWithSocialMeta('journal.html', {
    title: 'Journal & Insights — Kre8mind',
    description: 'Thoughts and perspectives on interface clarity, user psychology, design systems, and building modern software.',
    image: '/assets/social-cover.jpg',
    url: `${baseUrl}/journal`,
    type: 'website'
  }, req));
});

// Journal Page (Supports ?id= or ?article= query)
app.get('/journal', async (req, res) => {
  const queryId = req.query.id || req.query.article;
  const baseUrl = getBaseUrl(req);

  if (queryId) {
    const article = await findJournalArticle(queryId);
    if (article) {
      const meta = {
        title: `${article.title} — Kre8mind Journal`,
        description: article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
        image: article.image || '/assets/social-cover.jpg',
        url: `${baseUrl}/journal/${article.id}`,
        type: 'article'
      };
      return res.send(renderHtmlWithSocialMeta('journal.html', meta, req));
    }
  }

  return res.send(renderHtmlWithSocialMeta('journal.html', {
    title: 'Journal & Insights — Kre8mind',
    description: 'Thoughts and perspectives on interface clarity, user psychology, design systems, and building modern software.',
    image: '/assets/social-cover.jpg',
    url: `${baseUrl}/journal`,
    type: 'website'
  }, req));
});

// Services Page
app.get('/services', (req, res) => {
  res.send(renderHtmlWithSocialMeta('services.html', {
    title: 'Services & Capabilities — Kre8mind',
    description: 'Comprehensive product design, web architecture, and design system services by Kre8mind Studio.',
    image: '/assets/social-cover.jpg',
    url: `${getBaseUrl(req)}/services`,
    type: 'website'
  }, req));
});

// Admin Dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Homepage & Root Route
app.get('/', (req, res) => {
  res.send(renderHtmlWithSocialMeta('index.html', {
    title: 'Kre8mind - Clarity by Design',
    description: 'Kre8mind is a product design studio for product redesign, websites, and apps, making digital experiences clearer, more useful, and easier to trust.',
    image: '/assets/social-cover.jpg',
    url: `${getBaseUrl(req)}/`,
    type: 'website'
  }, req));
});

// Catch-all route for other client paths
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.send(renderHtmlWithSocialMeta('index.html', {
    title: 'Kre8mind - Clarity by Design',
    description: 'Kre8mind is a product design studio for product redesign, websites, and apps, making digital experiences clearer, more useful, and easier to trust.',
    image: '/assets/social-cover.jpg',
    url: `${getBaseUrl(req)}/`,
    type: 'website'
  }, req));
});

// Export app for Vercel Serverless
export default app;

// Start local server if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`✨ KRE8MIND STUDIO API & BACKEND ONLINE`);
    console.log(`🚀 Local Server:    http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`🩺 Health Check:    http://localhost:${PORT}/api/health`);
    console.log(`==================================================\n`);
  });
}


