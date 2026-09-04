import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import requestsRouter from './api/requests.js';
import projectsRouter from './api/projects.js';
import journalRouter from './api/journal.js';
import authRouter from './api/auth.js';
import analyticsRouter from './api/analytics.js';
import testimonialsRouter from './api/testimonials.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (HTML, CSS, JS, Images)
app.use(express.static(__dirname));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    studio: 'Kre8mind Studio API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// File Upload (Multer)
import multer from 'multer';
import fs from 'fs';

const uploadDir = path.join(__dirname, 'assets/showcase');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const relativePath = `assets/showcase/${req.file.filename}`;
  res.json({ success: true, filePath: relativePath });
});

app.post('/api/upload-multiple', upload.array('files', 20), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ success: false, error: 'No files uploaded' });
  const filePaths = req.files.map(f => `assets/showcase/${f.filename}`);
  res.json({ success: true, filePaths });
});

// API Routes
app.use('/api/requests', requestsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/auth', authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/testimonials', testimonialsRouter);

// Fallback to index.html for undefined routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`✨ KRE8MIND STUDIO API & BACKEND ONLINE`);
  console.log(`🚀 Local Server:    http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`🩺 Health Check:    http://localhost:${PORT}/api/health`);
  console.log(`==================================================\n`);
});
