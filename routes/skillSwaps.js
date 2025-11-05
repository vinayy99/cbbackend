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

    // Record initial status history
    await pool.execute('INSERT INTO skill_swap_status_history (swap_id, status, changed_by) VALUES (?, ?, ?)', [swapId, 'pending', req.userId]);

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

    // Record status change
    await pool.execute('INSERT INTO skill_swap_status_history (swap_id, status, changed_by) VALUES (?, ?, ?)', [req.params.id, status, req.userId]);

    // Create notification for the requester
    const toNotify = swaps[0].from_user_id; // requester gets notified about recipient's decision
    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [toNotify, 'swap_' + status, 'Skill swap ' + status, `Your skill swap request was ${status}.`, `/skill-swaps`]
    );

    res.json({ message: `Skill swap ${status}` });
  } catch (error) {
    console.error('Error updating skill swap status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a swap
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const swapId = req.params.id;
    const [messages] = await pool.execute(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM skill_swap_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.swap_id = ? ORDER BY m.created_at ASC`,
      [swapId]
    );
    res.json(messages);
  } catch (error) {
    console.error('Error fetching swap messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a message in a swap
router.post('/:id/messages', authMiddleware, async (req, res) => {
  const swapId = req.params.id;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    // Ensure user is part of the swap
    const [swaps] = await pool.execute('SELECT * FROM skill_swaps WHERE id = ?', [swapId]);
    if (swaps.length === 0) return res.status(404).json({ error: 'Skill swap not found' });
    const swap = swaps[0];
    if (![swap.from_user_id, swap.to_user_id].includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });

    const [result] = await pool.execute('INSERT INTO skill_swap_messages (swap_id, sender_id, message) VALUES (?, ?, ?)', [swapId, req.userId, message]);
    const [rows] = await pool.execute('SELECT * FROM skill_swap_messages WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get status history
router.get('/:id/history', authMiddleware, async (req, res) => {
  try {
    const swapId = req.params.id;
    const [rows] = await pool.execute('SELECT * FROM skill_swap_status_history WHERE swap_id = ? ORDER BY created_at ASC', [swapId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

