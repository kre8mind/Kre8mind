import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '../data/db.json');

const router = express.Router();

function readLocalDbProjects() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
      return Array.isArray(parsed.projects) ? parsed.projects : [];
    }
  } catch (e) {
    console.error('Error reading local db.json:', e);
  }
  return [];
}

function syncProjectToLocalDb(action, project) {
  try {
    if (!fs.existsSync(DB_JSON_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    if (!Array.isArray(parsed.projects)) parsed.projects = [];

    if (action === 'insert') {
      const exists = parsed.projects.some(p => p.id === project.id);
      if (!exists) parsed.projects.push(project);
    } else if (action === 'update') {
      const idx = parsed.projects.findIndex(p => p.id === project.id);
      if (idx !== -1) {
        parsed.projects[idx] = { ...parsed.projects[idx], ...project };
      }
    } else if (action === 'delete') {
      parsed.projects = parsed.projects.filter(p => p.id !== project.id);
    } else if (action === 'reorder') {
      // project is array of IDs
      const orderMap = new Map(project.map((id, idx) => [id, idx + 1]));
      parsed.projects.forEach(p => {
        if (orderMap.has(p.id)) p.order = orderMap.get(p.id);
      });
      parsed.projects.sort((a, b) => (a.order || 99) - (b.order || 99));
    }

    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.warn('Sync to local db.json note:', e.message);
  }
}

// GET all projects
router.get('/', async (req, res) => {
  try {
    const col = await getCollection('projects');
    const list = await col.find({}).sort({ order: 1, createdAt: -1 }).toArray();

    const sanitized = list.map(item => {
      const { _id, ...rest } = item;
      return { id: item.id || String(_id), ...rest };
    });

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      projects: sanitized
    });
  } catch (err) {
    console.error('Error fetching projects from MongoDB, using db.json fallback:', err);
    const localProjects = readLocalDbProjects();
    res.json({
      success: true,
      count: localProjects.length,
      data: localProjects,
      projects: localProjects
    });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const col = await getCollection('projects');
    const project = await col.findOne({ id: req.params.id });
    if (project) {
      const { _id, ...clean } = project;
      return res.json({ success: true, project: clean });
    }
  } catch (err) {
    console.error('Error fetching project from DB:', err);
  }

  // Fallback to local db.json
  const localProjects = readLocalDbProjects();
  const found = localProjects.find(p => p.id === req.params.id);
  if (found) {
    return res.json({ success: true, project: found });
  }

  return res.status(404).json({ success: false, error: 'Project not found.' });
});

// POST new project
router.post('/', async (req, res) => {
  try {
    const { title, category, year, summary, image, tags, featured, layout, hasCaseStudy, caseStudySlices } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required.' });
    }

    const slices = Array.isArray(caseStudySlices) ? caseStudySlices : [];
    const hasCase = hasCaseStudy !== undefined ? hasCaseStudy : (slices.length > 0);

    let count = 0;
    try {
      const col = await getCollection('projects');
      count = await col.countDocuments();
    } catch {}

    const newProject = {
      id: `proj_${Date.now()}`,
      title: title.trim(),
      category: category.trim(),
      year: year || `${new Date().getFullYear()}`,
      summary: summary || '',
      layout: layout || '16:9 Standard',
      image: image || 'assets/showcase/journal-1.jpg',
      tags: Array.isArray(tags) ? tags : [],
      order: count + 1,
      featured: featured !== undefined ? featured : true,
      hasCaseStudy: hasCase,
      caseStudySlices: slices,
      createdAt: new Date().toISOString()
    };

    try {
      const col = await getCollection('projects');
      await col.insertOne({ ...newProject });
    } catch (dbErr) {
      console.warn('MongoDB insert project note:', dbErr.message);
    }

    syncProjectToLocalDb('insert', newProject);

    res.status(201).json({ success: true, data: newProject, project: newProject });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (Array.isArray(updateData.caseStudySlices)) {
      if (updateData.hasCaseStudy === undefined) {
        updateData.hasCaseStudy = updateData.caseStudySlices.length > 0;
      }
    }

    let updated = null;
    try {
      const col = await getCollection('projects');
      await col.updateOne({ id: id }, { $set: updateData });
      updated = await col.findOne({ id: id });
    } catch (dbErr) {
      console.warn('MongoDB update project note:', dbErr.message);
    }

    syncProjectToLocalDb('update', { id, ...updateData });

    if (!updated) {
      const local = readLocalDbProjects().find(p => p.id === id);
      if (local) {
        return res.json({ success: true, project: local });
      }
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const { _id, ...clean } = updated;
    res.json({ success: true, project: clean });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// POST reorder projects
router.post('/reorder', async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ success: false, error: 'projectIds array is required.' });
    }

    try {
      const col = await getCollection('projects');
      const bulkOps = projectIds.map((id, idx) => ({
        updateOne: {
          filter: { id: id },
          update: { $set: { order: idx + 1 } }
        }
      }));

      if (bulkOps.length > 0) {
        await col.bulkWrite(bulkOps);
      }
    } catch (dbErr) {
      console.warn('MongoDB reorder note:', dbErr.message);
    }

    syncProjectToLocalDb('reorder', projectIds);

    res.json({ success: true, message: 'Projects reordered successfully.' });
  } catch (err) {
    console.error('Error reordering projects:', err);
    res.status(500).json({ success: false, error: 'Failed to reorder projects' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const col = await getCollection('projects');
      const { ObjectId } = await import('mongodb');
      const query = { $or: [{ id: id }] };
      if (ObjectId.isValid(id)) query.$or.push({ _id: new ObjectId(id) });
      await col.deleteOne(query);
    } catch (dbErr) {
      console.warn('MongoDB delete note:', dbErr.message);
    }

    syncProjectToLocalDb('delete', { id });

    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
