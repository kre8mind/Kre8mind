import express from 'express';
import { getCollection } from '../db/mongodb.js';

const router = express.Router();

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
    console.error('Error fetching projects:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const col = await getCollection('projects');
    const project = await col.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }
    const { _id, ...clean } = project;
    res.json({ success: true, project: clean });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// POST new project
router.post('/', async (req, res) => {
  try {
    const { title, category, year, summary, image, tags, featured, layout, hasCaseStudy, caseStudySlices } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required.' });
    }

    const col = await getCollection('projects');
    const count = await col.countDocuments();

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
      hasCaseStudy: hasCaseStudy !== undefined ? hasCaseStudy : true,
      caseStudySlices: Array.isArray(caseStudySlices) ? caseStudySlices : [],
      createdAt: new Date().toISOString()
    };

    await col.insertOne({ ...newProject });
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
    const col = await getCollection('projects');

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await col.updateOne({ id: id }, { $set: updateData });
    const updated = await col.findOne({ id: id });

    if (!updated) {
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
    const col = await getCollection('projects');
    const result = await col.deleteOne({ id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
