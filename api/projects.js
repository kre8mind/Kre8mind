import express from 'express';
import { db } from '../db/database.js';

const router = express.Router();

// GET all projects
router.get('/', (req, res) => {
  const data = db.read();
  const sortedProjects = [...(data.projects || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({
    success: true,
    count: sortedProjects.length,
    data: sortedProjects,
    projects: sortedProjects
  });
});

// GET single project
router.get('/:id', (req, res) => {
  const data = db.read();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }
  res.json({ success: true, project });
});

// POST new project
router.post('/', (req, res) => {
  const { title, category, year, summary, image, tags, featured, layout, hasCaseStudy, caseStudySlices } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'Title and category are required.' });
  }

  const data = db.read();
  const newProject = {
    id: `proj_${Date.now()}`,
    title: title.trim(),
    category: category.trim(),
    year: year || `${new Date().getFullYear()}`,
    summary: summary || '',
    layout: layout || '16:9 Standard',
    image: image || 'assets/showcase/journal-1.jpg',
    tags: Array.isArray(tags) ? tags : [],
    order: (data.projects || []).length + 1,
    featured: featured !== undefined ? featured : true,
    hasCaseStudy: hasCaseStudy !== undefined ? hasCaseStudy : true,
    caseStudySlices: Array.isArray(caseStudySlices) ? caseStudySlices : [],
    createdAt: new Date().toISOString()
  };

  data.projects.push(newProject);
  db.write(data);
  res.status(201).json({ success: true, data: newProject, project: newProject });
});

// PUT update project
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const index = data.projects.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }

  data.projects[index] = {
    ...data.projects[index],
    ...req.body,
    id: id // protect id from overwrite
  };

  db.write(data);
  res.json({ success: true, project: data.projects[index] });
});

// POST reorder projects
router.post('/reorder', (req, res) => {
  const { projectIds } = req.body;
  if (!Array.isArray(projectIds)) {
    return res.status(400).json({ success: false, error: 'projectIds array is required.' });
  }

  const data = db.read();
  projectIds.forEach((id, idx) => {
    const proj = data.projects.find(p => p.id === id);
    if (proj) {
      proj.order = idx + 1;
    }
  });

  db.write(data);
  res.json({ success: true, message: 'Projects reordered successfully.' });
});

// DELETE project
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.read();
  const initialLength = data.projects.length;
  data.projects = data.projects.filter(p => p.id !== id);

  if (data.projects.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }

  db.write(data);
  res.json({ success: true, message: 'Project deleted successfully.' });
});

export default router;
