import express from 'express';
import { pool } from '../database/config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.userId]);
    res.json({ count: rows[0]?.cnt || 0 });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark one as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL', [req.userId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


