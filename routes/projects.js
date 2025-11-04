import express from 'express';
import { pool } from '../database/config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const [projects] = await pool.execute(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );

    for (const project of projects) {
      // Get required skills
      const [skillRows] = await pool.execute(
        'SELECT skill FROM project_skills WHERE project_id = ?',
        [project.id]
      );
      project.requiredSkills = skillRows.map(row => row.skill);

      // Get members
      const [memberRows] = await pool.execute(
        'SELECT user_id FROM project_members WHERE project_id = ?',
        [project.id]
      );
      project.members = memberRows.map(row => row.user_id);

      // Get creator info
      const [creatorRows] = await pool.execute(
        'SELECT id, name, email, avatar FROM users WHERE id = ?',
        [project.creator_id]
      );
      project.creator = creatorRows[0];
    }

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[0];

    // Get required skills
    const [skillRows] = await pool.execute(
      'SELECT skill FROM project_skills WHERE project_id = ?',
      [project.id]
    );
    project.requiredSkills = skillRows.map(row => row.skill);

    // Get members
    const [memberRows] = await pool.execute(
      'SELECT user_id FROM project_members WHERE project_id = ?',
      [project.id]
    );
    project.members = memberRows.map(row => row.user_id);

    // Get creator info
    const [creatorRows] = await pool.execute(
      'SELECT id, name, email, avatar FROM users WHERE id = ?',
      [project.creator_id]
    );
    project.creator = creatorRows[0];

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, requiredSkills } = req.body;

  if (!title || !description || !requiredSkills || !Array.isArray(requiredSkills)) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Insert project
    const [result] = await pool.execute(
      'INSERT INTO projects (title, description, creator_id) VALUES (?, ?, ?)',
      [title, description, req.userId]
    );

    const projectId = result.insertId;

    // Insert required skills
    for (const skill of requiredSkills) {
      await pool.execute(
        'INSERT INTO project_skills (project_id, skill) VALUES (?, ?)',
        [projectId, skill]
      );
    }

    // Add creator as a member
    await pool.execute(
      'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
      [projectId, req.userId]
    );

    // Fetch created project
    const [projects] = await pool.execute(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    const project = projects[0];
    project.requiredSkills = requiredSkills;
    project.members = [req.userId];

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join project
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    // Check if user is already a member
    const [existingMembers] = await pool.execute(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (existingMembers.length > 0) {
      return res.status(400).json({ error: 'Already a member of this project' });
    }

    // Add user as member
    await pool.execute(
      'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
      [req.params.id, req.userId]
    );

    res.json({ message: 'Successfully joined project' });
  } catch (error) {
    console.error('Error joining project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

