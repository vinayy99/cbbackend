import express from 'express';
import { pool } from '../database/config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Create application to join a project
router.post('/projects/:projectId/applications', authMiddleware, async (req, res) => {
  const { projectId } = req.params;
  const { message } = req.body;
  try {
    // Avoid duplicate application if already member
    const [memberRows] = await pool.execute(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.userId]
    );
    if (memberRows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this project' });
    }

    // Avoid multiple pending applications by same user
    const [existing] = await pool.execute(
      'SELECT id FROM project_applications WHERE project_id = ? AND user_id = ? AND status = "pending"',
      [projectId, req.userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have a pending application' });
    }

    const [result] = await pool.execute(
      'INSERT INTO project_applications (project_id, user_id, message) VALUES (?, ?, ?)',
      [projectId, req.userId, message || null]
    );

    const [rows] = await pool.execute('SELECT * FROM project_applications WHERE id = ?', [result.insertId]);

    // Notify project creator about new application
    const [projRows] = await pool.execute('SELECT title, creator_id FROM projects WHERE id = ?', [projectId]);
    if (projRows.length > 0) {
      const project = projRows[0];
      await pool.execute(
        'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
        [project.creator_id, 'application_created', 'New project application', 'Someone applied to your project: ' + project.title, `/project/${projectId}`]
      );
    }

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get applications for a project (creator only)
router.get('/projects/:projectId/applications', authMiddleware, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Ensure requester is project creator
    const [projects] = await pool.execute('SELECT creator_id FROM projects WHERE id = ?', [projectId]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (projects[0].creator_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const [apps] = await pool.execute(
      `SELECT pa.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
       FROM project_applications pa
       JOIN users u ON u.id = pa.user_id
       WHERE pa.project_id = ?
       ORDER BY pa.created_at DESC`,
      [projectId]
    );
    res.json(apps);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update application status (accept/decline) - creator only
router.patch('/applications/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted' | 'declined'
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const [apps] = await pool.execute('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (apps.length === 0) return res.status(404).json({ error: 'Application not found' });
    const app = apps[0];

    // Ensure requester is project creator
    const [projects] = await pool.execute('SELECT creator_id FROM projects WHERE id = ?', [app.project_id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (projects[0].creator_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    // Update status
    await pool.execute('UPDATE project_applications SET status = ? WHERE id = ?', [status, id]);

    // On accept, add to project_members if not already
    if (status === 'accepted') {
      const [memberRows] = await pool.execute(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [app.project_id, app.user_id]
      );
      if (memberRows.length === 0) {
        await pool.execute('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)', [app.project_id, app.user_id]);
      }
    }

    // Notify applicant
    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [app.user_id, 'application_' + status, 'Application ' + status, `Your application for project #${app.project_id} was ${status}.`, `/project/${app.project_id}`]
    );

    const [updated] = await pool.execute('SELECT * FROM project_applications WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


