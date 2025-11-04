import express from 'express';
import { pool } from '../database/config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all skill swaps for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [swaps] = await pool.execute(
      'SELECT * FROM skill_swaps WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC',
      [req.userId, req.userId]
    );

    // Enrich with user information
    for (const swap of swaps) {
      const [fromUserRows] = await pool.execute(
        'SELECT id, name, email, avatar FROM users WHERE id = ?',
        [swap.from_user_id]
      );
      const [toUserRows] = await pool.execute(
        'SELECT id, name, email, avatar FROM users WHERE id = ?',
        [swap.to_user_id]
      );

      swap.fromUser = fromUserRows[0];
      swap.toUser = toUserRows[0];
    }

    res.json(swaps);
  } catch (error) {
    console.error('Error fetching skill swaps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get skill swap by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [swaps] = await pool.execute(
      'SELECT * FROM skill_swaps WHERE id = ?',
      [req.params.id]
    );

    if (swaps.length === 0) {
      return res.status(404).json({ error: 'Skill swap not found' });
    }

    const swap = swaps[0];

    // Enrich with user information
    const [fromUserRows] = await pool.execute(
      'SELECT id, name, email, avatar FROM users WHERE id = ?',
      [swap.from_user_id]
    );
    const [toUserRows] = await pool.execute(
      'SELECT id, name, email, avatar FROM users WHERE id = ?',
      [swap.to_user_id]
    );

    swap.fromUser = fromUserRows[0];
    swap.toUser = toUserRows[0];

    res.json(swap);
  } catch (error) {
    console.error('Error fetching skill swap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Propose skill swap
router.post('/', authMiddleware, async (req, res) => {
  const { toUserId, offeredSkill, requestedSkill, message } = req.body;

  if (!toUserId || !offeredSkill || !requestedSkill) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO skill_swaps (from_user_id, to_user_id, offered_skill, requested_skill, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, toUserId, offeredSkill, requestedSkill, message || '', 'pending']
    );

    const swapId = result.insertId;

    // Fetch created swap
    const [swaps] = await pool.execute(
      'SELECT * FROM skill_swaps WHERE id = ?',
      [swapId]
    );

    const swap = swaps[0];

    // Enrich with user information
    const [fromUserRows] = await pool.execute(
      'SELECT id, name, email, avatar FROM users WHERE id = ?',
      [swap.from_user_id]
    );
    const [toUserRows] = await pool.execute(
      'SELECT id, name, email, avatar FROM users WHERE id = ?',
      [swap.to_user_id]
    );

    swap.fromUser = fromUserRows[0];
    swap.toUser = toUserRows[0];

    res.status(201).json(swap);
  } catch (error) {
    console.error('Error creating skill swap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update skill swap status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // Check if user has permission (must be the recipient)
    const [swaps] = await pool.execute(
      'SELECT * FROM skill_swaps WHERE id = ?',
      [req.params.id]
    );

    if (swaps.length === 0) {
      return res.status(404).json({ error: 'Skill swap not found' });
    }

    if (swaps[0].to_user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.execute(
      'UPDATE skill_swaps SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    res.json({ message: `Skill swap ${status}` });
  } catch (error) {
    console.error('Error updating skill swap status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

