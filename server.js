import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import fs from 'fs';
import { getCollection, connectToDatabase } from './db/mongodb.js';
import { GridFSBucket } from 'mongodb';

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

// High-performance gzip/brotli response compression
app.use(compression());

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static assets (WebP, Images, Fonts cached; CSS/JS non-cached in development)
const isProd = process.env.NODE_ENV === 'production';
app.use(express.static(__dirname, {
  index: false,
  redirect: false,
  maxAge: isProd ? '7d' : 0,
  setHeaders: (res, filePath) => {
    if (/\.(webp|jpg|jpeg|png|gif|svg|ico|woff2|woff|ttf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', isProd ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Direct Favicon & Social Cover Endpoints
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(__dirname, 'assets', 'favicon.ico');
  if (fs.existsSync(icoPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.sendFile(icoPath);
  }
  res.status(404).end();
});

app.get(['/favicon.png', '/assets/favicon-96.png'], (req, res) => {
  const pngPath = path.join(__dirname, 'assets', 'favicon-96.png');
  if (fs.existsSync(pngPath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.sendFile(pngPath);
  }
  res.status(404).end();
});

app.get('/favicon.jpg', (req, res) => {
  const icoPath = path.join(__dirname, 'assets', 'FAVICON.jpg');
  if (fs.existsSync(icoPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.sendFile(icoPath);
  }
  res.status(404).end();
});

app.get('/social-cover.jpg', (req, res) => {
  const coverPath = path.join(__dirname, 'assets', 'social-cover.jpg');
  if (fs.existsSync(coverPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(coverPath);
  }
  res.status(404).end();
});

// Search Engine Discovery & Crawling Directives (robots.txt)
app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(__dirname, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  const defaultRobots = `# https://www.robotstxt.org/robotstxt.html\nUser-agent: GPTBot\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: OAI-SearchBot\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: PerplexityBot\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: ClaudeBot\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: Google-Extended\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: Applebot-Extended\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /data/\n\nUser-agent: *\nAllow: /\nAllow: /services\nAllow: /projects\nAllow: /project/\nAllow: /case-study/\nAllow: /journal\nAllow: /journal/\nAllow: /assets/\nAllow: /css/\nAllow: /js/\nAllow: /llms.txt\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /data/\n\nSitemap: https://kre8mind.com/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(defaultRobots);
});

// Generative Engine Optimization & LLM Context Specification (llms.txt)
app.get('/llms.txt', (req, res) => {
  const llmsPath = path.join(__dirname, 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(llmsPath);
  }
  res.status(404).send('llms.txt not found');
});

// Dynamic XML Sitemap for Search Engines (Google, Bing, Yahoo, DuckDuckGo)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = 'https://kre8mind.com';
    const now = new Date().toISOString().split('T')[0];

    const urlMap = new Map();
    // Core landing pages
    urlMap.set(`${baseUrl}/`, { loc: `${baseUrl}/`, lastmod: now, changefreq: 'weekly', priority: '1.0' });
    urlMap.set(`${baseUrl}/services`, { loc: `${baseUrl}/services`, lastmod: now, changefreq: 'monthly', priority: '0.9' });
    urlMap.set(`${baseUrl}/projects`, { loc: `${baseUrl}/projects`, lastmod: now, changefreq: 'weekly', priority: '0.9' });
    urlMap.set(`${baseUrl}/journal`, { loc: `${baseUrl}/journal`, lastmod: now, changefreq: 'weekly', priority: '0.8' });

    // 1. Fetch live Projects from MongoDB
    try {
      const col = await getCollection('projects');
      const projects = await col.find({}).toArray();
      if (Array.isArray(projects)) {
        projects.forEach(p => {
          if (p && p.id) {
            const mod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : now);
            urlMap.set(`${baseUrl}/project/${p.id}`, {
              loc: `${baseUrl}/project/${encodeURIComponent(p.id)}`,
              lastmod: mod,
              changefreq: 'weekly',
              priority: '0.8'
            });
          }
        });
      }
    } catch (dbErr) {
      console.warn('Sitemap projects DB note:', dbErr.message);
    }

    // 2. Fallback to local data/db.json if projects empty
    try {
      const localDbPath = path.join(__dirname, 'data', 'db.json');
      if (fs.existsSync(localDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        if (Array.isArray(parsed.projects)) {
          parsed.projects.forEach(p => {
            if (p && p.id && !urlMap.has(`${baseUrl}/project/${p.id}`)) {
              const mod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : now;
              urlMap.set(`${baseUrl}/project/${p.id}`, {
                loc: `${baseUrl}/project/${encodeURIComponent(p.id)}`,
                lastmod: mod,
                changefreq: 'weekly',
                priority: '0.8'
              });
            }
          });
        }
      }
    } catch (fErr) {
      console.warn('Sitemap db.json fallback note:', fErr.message);
    }

    // Baseline project guarantees
    const defaultProjIds = ['proj_1788486163854', 'proj_01', 'proj_02', 'proj_03'];
    defaultProjIds.forEach(id => {
      if (!urlMap.has(`${baseUrl}/project/${id}`)) {
        urlMap.set(`${baseUrl}/project/${id}`, {
          loc: `${baseUrl}/project/${id}`,
          lastmod: now,
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    });

    // 3. Fetch live Journal Articles from MongoDB
    try {
      const jCol = await getCollection('journal');
      const articles = await jCol.find({}).toArray();
      if (Array.isArray(articles)) {
        articles.forEach(a => {
          if (a && a.id) {
            const mod = a.updatedAt ? new Date(a.updatedAt).toISOString().split('T')[0] : (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : now);
            urlMap.set(`${baseUrl}/journal/${a.id}`, {
              loc: `${baseUrl}/journal/${encodeURIComponent(a.id)}`,
              lastmod: mod,
              changefreq: 'monthly',
              priority: '0.7'
            });
          }
        });
      }
    } catch (jErr) {
      console.warn('Sitemap journal DB note:', jErr.message);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const entry of urlMap.values()) {
      xml += `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>\n`;
    }
    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    return res.send(xml);
  } catch (err) {
    console.error('Error generating dynamic sitemap:', err);
    res.status(500).send('Error generating sitemap');
  }
});

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

// File Upload (Multer Memory Storage + Disk Cache - Serverless & Atlas Safe)
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 } // 60MB for large Figma exports & video slices
});

const uploadDir = path.join(__dirname, 'assets', 'showcase');
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}
}

// Assets showcase fallback route (serves from disk if present, else fetches from MongoDB Atlas)
app.get('/assets/showcase/:file', async (req, res, next) => {
  const diskPath = path.join(uploadDir, req.params.file);
  if (fs.existsSync(diskPath)) {
    return res.sendFile(diskPath);
  }
  try {
    const media = await getMediaFromAtlas(req.params.file);
    if (media) {
      res.setHeader('Content-Type', media.mimetype);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(media.buffer);
    }
  } catch {}
  next();
});

// Helper to save buffer to MongoDB Atlas (regular collection or GridFS)
async function saveMediaToAtlas({ mediaId, filename, originalName, mimetype, buffer, size }) {
  const isLarge = size >= 15 * 1024 * 1024;
  if (isLarge) {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'media_files' });
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: { mediaId, originalName, mimetype, size, createdAt: new Date() }
      });
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve({ id: uploadStream.id, gridfs: true }));
      uploadStream.end(buffer);
    });
  } else {
    const mediaCol = await getCollection('media');
    await mediaCol.updateOne(
      { mediaId },
      {
        $set: {
          mediaId,
          filename,
          originalName,
          mimetype,
          data: buffer,
          size,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    return { gridfs: false };
  }
}

// Helper to fetch media from MongoDB Atlas
async function getMediaFromAtlas(id) {
  const cleanId = id.replace(/\.[^/.]+$/, '');
  
  // 1. Try media collection
  try {
    const mediaCol = await getCollection('media');
    const item = await mediaCol.findOne({
      $or: [
        { mediaId: id },
        { mediaId: cleanId },
        { filename: id },
        { originalName: id },
        { mediaId: { $regex: new RegExp(`^${cleanId}`, 'i') } }
      ]
    });
    if (item && item.data) {
      const buf = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data.buffer || item.data);
      return { buffer: buf, mimetype: item.mimetype || 'image/jpeg', size: buf.length };
    }
  } catch (colErr) {
    console.warn('Atlas collection lookup note:', colErr.message);
  }

  // 2. Try GridFSBucket
  try {
    const { db } = await connectToDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'media_files' });
    const files = await bucket.find({
      $or: [
        { filename: id },
        { filename: cleanId },
        { 'metadata.mediaId': id },
        { 'metadata.mediaId': cleanId },
        { 'metadata.originalName': id }
      ]
    }).toArray();

    if (files.length > 0) {
      const file = files[0];
      return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = bucket.openDownloadStream(file._id);
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({ buffer: buf, mimetype: file.metadata?.mimetype || 'application/octet-stream', size: buf.length });
        });
      });
    }
  } catch (gErr) {
    console.warn('Atlas GridFS lookup note:', gErr.message);
  }

  return null;
}

// Serve uploaded media (handles local disk cache and MongoDB Atlas Cloud / GridFS)
app.get('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if directly available in assets/showcase on disk
    const diskPath = path.join(uploadDir, id);
    if (fs.existsSync(diskPath)) {
      return res.sendFile(diskPath);
    }

    const media = await getMediaFromAtlas(id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.setHeader('Content-Type', media.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(media.buffer);
  } catch (err) {
    console.error('Error serving media:', err);
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

    const originalName = req.file.originalname || 'upload.png';
    const ext = path.extname(originalName) || (req.file.mimetype?.startsWith('video/') ? '.mp4' : '.jpg');
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'media';
    const filename = `${base}_${Date.now()}${ext}`;
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const diskPath = path.join(uploadDir, filename);
    const isVideo = (req.file.mimetype && req.file.mimetype.startsWith('video/')) || /\.(mp4|webm|mov)$/i.test(ext);

    // Save to disk if writable
    try {
      fs.writeFileSync(diskPath, req.file.buffer);
    } catch {}

    // Persist directly to MongoDB Atlas Cloud (cluster)
    try {
      await saveMediaToAtlas({
        mediaId,
        filename,
        originalName,
        mimetype: req.file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg'),
        buffer: req.file.buffer,
        size: req.file.size
      });
    } catch (dbErr) {
      console.warn('Atlas media backup warning:', dbErr.message);
    }

    res.json({
      success: true,
      filePath: `/api/media/${filename}`,
      filename,
      mediaId,
      mimetype: req.file.mimetype,
      isVideo,
      type: isVideo ? 'video' : 'image'
    });
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
      const filePaths = [];
      const slices = [];

      for (const file of req.files) {
        const originalName = file.originalname || 'slice.png';
        const ext = path.extname(originalName) || (file.mimetype?.startsWith('video/') ? '.mp4' : '.jpg');
        const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'slice';
        const filename = `${base}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
        const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const diskPath = path.join(uploadDir, filename);
        const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) || /\.(mp4|webm|mov)$/i.test(ext);
        const filePath = `/api/media/${filename}`;

        try {
          fs.writeFileSync(diskPath, file.buffer);
        } catch {}

        try {
          await saveMediaToAtlas({
            mediaId,
            filename,
            originalName,
            mimetype: file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg'),
            buffer: file.buffer,
            size: file.size
          });
        } catch (mErr) {
          console.warn('Mongo slice save warning:', mErr.message);
        }

        filePaths.push(filePath);
        slices.push({
          type: isVideo ? 'video' : 'image',
          url: filePath,
          caption: originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || `Slide ${slices.length + 1}`
        });
      }

      res.json({ success: true, filePaths, slices });
    } catch (dbErr) {
      console.error('Atlas multiple media save error:', dbErr);
      res.status(500).json({ success: false, error: 'Failed to save media files' });
    }
  });
});

// Chunked file upload (bypasses Vercel 4.5MB serverless limit)
app.post('/api/upload-chunk', (req, res) => {
  upload.single('chunk')(req, res, async (err) => {
    if (err) {
      console.error('Chunk upload error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Chunk upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No chunk data received' });
    }

    const uploadId = req.body.uploadId;
    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const originalName = req.body.filename || 'upload.bin';
    const clientMime = req.body.mimetype;

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return res.status(400).json({ success: false, error: 'Missing chunk metadata' });
    }

    try {
      const chunksCol = await getCollection('upload_chunks');
      await chunksCol.updateOne(
        { uploadId, chunkIndex },
        {
          $set: {
            uploadId,
            chunkIndex,
            data: req.file.buffer,
            size: req.file.size,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      const savedCount = await chunksCol.countDocuments({ uploadId });
      if (savedCount < totalChunks) {
        return res.json({ success: true, chunkIndex, progress: Math.round((savedCount / totalChunks) * 100) });
      }

      // Reassemble all chunks
      const allChunks = await chunksCol.find({ uploadId }).sort({ chunkIndex: 1 }).toArray();
      const buffers = allChunks.map(c => Buffer.isBuffer(c.data) ? c.data : Buffer.from(c.data.buffer || c.data));
      const fullBuffer = Buffer.concat(buffers);

      // Clean up temporary chunks
      await chunksCol.deleteMany({ uploadId }).catch(() => {});

      const ext = path.extname(originalName) || (clientMime?.startsWith('video/') ? '.mp4' : '.jpg');
      const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'media';
      const filename = `${base}_${Date.now()}${ext}`;
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const isVideo = (clientMime && clientMime.startsWith('video/')) || /\.(mp4|webm|mov)$/i.test(ext);
      const diskPath = path.join(uploadDir, filename);

      try {
        fs.writeFileSync(diskPath, fullBuffer);
      } catch {}

      await saveMediaToAtlas({
        mediaId,
        filename,
        originalName,
        mimetype: clientMime || (isVideo ? 'video/mp4' : 'image/jpeg'),
        buffer: fullBuffer,
        size: fullBuffer.length
      });

      res.json({
        success: true,
        filePath: `/api/media/${filename}`,
        filename,
        mediaId,
        mimetype: clientMime,
        isVideo,
        type: isVideo ? 'video' : 'image'
      });
    } catch (chunkErr) {
      console.error('Error assembling chunked upload:', chunkErr);
      res.status(500).json({ success: false, error: 'Failed to process file chunk' });
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
    const CANONICAL_BASE = 'https://kre8mind.com';
    const baseUrl = getBaseUrl(req);
    const canonicalPath = (req.originalUrl || '').split('?')[0];
    const canonicalUrl = meta.canonicalUrl || `${CANONICAL_BASE}${canonicalPath === '/index.html' ? '/' : canonicalPath}`;

    let imageUrl = meta.image || '/assets/social-cover.jpg';
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = `${CANONICAL_BASE}/${imageUrl.replace(/^\/+/, '')}`;
    }

    const title = meta.title || 'Kre8mind · Clarity by Design';
    const description = meta.description || 'Kre8mind is a product design studio for product redesign, websites, and apps, making digital experiences clearer, more useful, and easier to trust.';
    const pageUrl = meta.url || canonicalUrl;
    const type = meta.type || 'website';

    // Replace <title>
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

    // Clean out existing meta description, og:, twitter:, canonical, and robots tags to prevent duplication
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');

    let jsonLdBlock = '';
    if (meta.jsonLd) {
      jsonLdBlock = `\n  <!-- Dynamic Schema.org JSON-LD -->\n  <script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n  </script>`;
    }

    const dynamicMeta = `
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Dynamic OpenGraph & Twitter Social Meta -->
  <meta property="og:site_name" content="Kre8mind">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1600">
  <meta property="og:image:height" content="987">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="${type}">
  <meta property="og:locale" content="en_US">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@kre8mind">
  <meta name="twitter:creator" content="@kre8mind">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Favicon -->
  <link rel="icon" type="image/jpeg" href="${baseUrl}/assets/FAVICON.jpg">
  <link rel="shortcut icon" href="${baseUrl}/favicon.ico">
  <link rel="apple-touch-icon" href="${baseUrl}/assets/FAVICON.jpg">${jsonLdBlock}`;

    return html.replace('</head>', `${dynamicMeta}\n</head>`);
  } catch (err) {
    console.error('Error rendering HTML with social meta:', err);
    return readTemplate(filename);
  }
}

const FALLBACK_PROJECTS = [
  {
    id: 'proj_1788486163854',
    title: 'Avenor',
    category: 'PROP-TECH',
    summary: 'Strategic Prop-Tech flagship platform redesign focusing on immersive property discovery, verified deal rooms, and transactional clarity.',
    image: '/assets/showcase/ave_cover_1788514443500.jpg'
  },
  {
    id: 'proj_01',
    title: 'Flowmetric',
    category: 'PRODUCT DESIGN',
    summary: 'Realtime quantitative trading and fintech analytics with ultra-low cognitive load data dashboards and instant order execution.',
    image: '/assets/showcase/mockup-1.jpg'
  },
  {
    id: 'proj_02',
    title: 'Hospitality Health',
    category: 'WEB PLATFORM',
    summary: 'Healthcare patient intake and clinical workforce management platform redesigned for frictionless onboarding.',
    image: '/assets/showcase/mockup-2.jpg'
  },
  {
    id: 'proj_03',
    title: 'SaaSify HQ',
    category: 'SAAS / SYSTEM',
    summary: 'B2B SaaS subscription billing and customer lifecycle command center.',
    image: '/assets/showcase/mockup-3.jpg'
  }
];

async function findProject(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();

  // 1. Try MongoDB Atlas
  try {
    const col = await getCollection('projects');
    const proj = await col.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { title: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });
    if (proj) return proj;
  } catch {}

  // 2. Try local data/db.json
  try {
    const localDbPath = path.join(__dirname, 'data', 'db.json');
    if (fs.existsSync(localDbPath)) {
      const parsed = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      if (Array.isArray(parsed.projects)) {
        const found = parsed.projects.find(p => 
          (p.id && p.id.toLowerCase() === cleanId) || 
          (p.title && p.title.toLowerCase() === cleanId)
        );
        if (found) return found;
      }
    }
  } catch {}

  // 3. Fallback to baseline showcase projects
  const fallback = FALLBACK_PROJECTS.find(p => 
    p.id.toLowerCase() === cleanId || 
    p.title.toLowerCase() === cleanId
  );
  return fallback || null;
}

async function findJournalArticle(identifier) {
  if (!identifier) return null;
  const rawId = String(identifier).trim();
  const cleanId = rawId.toLowerCase();
  const slugTarget = cleanId.replace(/[^a-z0-9]+/g, '-');

  // 1. Try MongoDB Atlas
  try {
    const col = await getCollection('journal');
    const article = await col.findOne({
      $or: [
        { id: rawId },
        { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { title: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    });
    if (article) return article;

    // Check by slug in Mongo
    const allArticles = await col.find({}).toArray();
    const slugMatch = allArticles.find(a => 
      (a.id && a.id.toLowerCase() === cleanId) ||
      (a.title && a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slugTarget)
    );
    if (slugMatch) return slugMatch;
  } catch (dbErr) {
    console.warn('findJournalArticle DB lookup note:', dbErr.message);
  }

  // 2. Try local data/db.json
  try {
    const localDbPath = path.join(__dirname, 'data', 'db.json');
    if (fs.existsSync(localDbPath)) {
      const parsed = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      if (Array.isArray(parsed.journal)) {
        const found = parsed.journal.find(a => 
          (a.id && a.id.toLowerCase() === cleanId) || 
          (a.id === rawId) ||
          (a.title && a.title.toLowerCase() === cleanId) ||
          (a.title && a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slugTarget)
        );
        if (found) return found;
      }
    }
  } catch (fErr) {
    console.warn('findJournalArticle db.json lookup note:', fErr.message);
  }

  return null;
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
      title: `${proj.title} | Kre8mind Case Study`,
      description: proj.summary || `Strategic design and product engineering case study for ${proj.title}. Engineered by Kre8mind Studio.`,
      image: proj.image || '/assets/social-cover.jpg',
      url: `${baseUrl}/project/${proj.id}`,
      type: 'article',
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": proj.title,
        "headline": `${proj.title} | Kre8mind Case Study`,
        "description": proj.summary || `Strategic design and product engineering case study for ${proj.title}.`,
        "url": `${baseUrl}/project/${proj.id}`,
        "image": proj.image ? (proj.image.startsWith('http') ? proj.image : `${baseUrl}/${proj.image.replace(/^\/+/, '')}`) : `${baseUrl}/assets/social-cover.jpg`,
        "author": {
          "@type": "Organization",
          "name": "Kre8mind",
          "url": "https://kre8mind.com/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Kre8mind",
          "url": "https://kre8mind.com/",
          "logo": "https://kre8mind.com/assets/kre8mind-logo.png"
        }
      }
    };
    return res.send(renderHtmlWithSocialMeta('projects.html', meta, req));
  }

  // Fallback to general projects
  return res.send(renderHtmlWithSocialMeta('projects.html', {
    title: 'Selected Projects & Case Studies | Kre8mind',
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
        title: `${proj.title} | Kre8mind Case Study`,
        description: proj.summary || `Strategic design and product engineering case study for ${proj.title}. Engineered by Kre8mind Studio.`,
        image: proj.image || '/assets/social-cover.jpg',
        url: `${baseUrl}/project/${proj.id}`,
        type: 'article',
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          "name": proj.title,
          "headline": `${proj.title} | Kre8mind Case Study`,
          "description": proj.summary || `Strategic design and product engineering case study for ${proj.title}.`,
          "url": `${baseUrl}/project/${proj.id}`,
          "image": proj.image ? (proj.image.startsWith('http') ? proj.image : `${baseUrl}/${proj.image.replace(/^\/+/, '')}`) : `${baseUrl}/assets/social-cover.jpg`,
          "author": {
            "@type": "Organization",
            "name": "Kre8mind",
            "url": "https://kre8mind.com/"
          }
        }
      };
      return res.send(renderHtmlWithSocialMeta('projects.html', meta, req));
    }
  }

  return res.send(renderHtmlWithSocialMeta('projects.html', {
    title: 'Selected Projects & Case Studies | Kre8mind',
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
      title: `${article.title} | Kre8mind Journal`,
      description: article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
      image: article.image || '/assets/social-cover.jpg',
      url: `${baseUrl}/journal/${article.id}`,
      type: 'article',
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.title,
        "description": article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
        "url": `${baseUrl}/journal/${article.id}`,
        "image": article.image ? (article.image.startsWith('http') ? article.image : `${baseUrl}/${article.image.replace(/^\/+/, '')}`) : `${baseUrl}/assets/social-cover.jpg`,
        "datePublished": article.createdAt || new Date().toISOString(),
        "author": {
          "@type": "Organization",
          "name": "Kre8mind",
          "url": "https://kre8mind.com/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Kre8mind",
          "url": "https://kre8mind.com/",
          "logo": "https://kre8mind.com/assets/kre8mind-logo.png"
        }
      }
    };
    return res.send(renderHtmlWithSocialMeta('journal.html', meta, req));
  }

  return res.send(renderHtmlWithSocialMeta('journal.html', {
    title: 'Journal & Insights | Kre8mind',
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
        title: `${article.title} | Kre8mind Journal`,
        description: article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
        image: article.image || '/assets/social-cover.jpg',
        url: `${baseUrl}/journal/${article.id}`,
        type: 'article',
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": article.title,
          "description": article.snippet || article.content?.substring(0, 160) || 'Thoughts and perspectives on interface clarity and digital product design.',
          "url": `${baseUrl}/journal/${article.id}`,
          "image": article.image ? (article.image.startsWith('http') ? article.image : `${baseUrl}/${article.image.replace(/^\/+/, '')}`) : `${baseUrl}/assets/social-cover.jpg`,
          "datePublished": article.createdAt || new Date().toISOString(),
          "author": {
            "@type": "Organization",
            "name": "Kre8mind",
            "url": "https://kre8mind.com/"
          }
        }
      };
      return res.send(renderHtmlWithSocialMeta('journal.html', meta, req));
    }
  }

  return res.send(renderHtmlWithSocialMeta('journal.html', {
    title: 'Journal & Insights | Kre8mind',
    description: 'Thoughts and perspectives on interface clarity, user psychology, design systems, and building modern software.',
    image: '/assets/social-cover.jpg',
    url: `${baseUrl}/journal`,
    type: 'website'
  }, req));
});

// Services Page (handles /services and /services/ cleanly)
app.get(['/services', '/services/'], (req, res) => {
  res.send(renderHtmlWithSocialMeta('services.html', {
    title: 'Services & Capabilities | Kre8mind',
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
    title: 'Kre8mind · Clarity by Design',
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
    title: 'Kre8mind · Clarity by Design',
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


