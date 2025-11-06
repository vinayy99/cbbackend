import express from 'express';
import { pool } from '../database/config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ✅ Get all skill swaps for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [swaps] = await pool.execute(
      `SELECT * FROM skill_swaps 
       WHERE from_user_id = ? OR to_user_id = ? 
       ORDER BY created_at DESC`,
      [req.userId, req.userId]
    );

    for (const swap of swaps) {
      const [[fromUser]] = await pool.execute(
        `SELECT id, name, email, avatar FROM users WHERE id = ?`,
        [swap.from_user_id]
      );
      const [[toUser]] = await pool.execute(
        `SELECT id, name, email, avatar FROM users WHERE id = ?`,
        [swap.to_user_id]
      );
      swap.fromUser = fromUser;
      swap.toUser = toUser;
    }

    res.json(swaps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Propose a skill swap
router.post('/', authMiddleware, async (req, res) => {
  const { toUserId, offeredSkill, requestedSkill, message } = req.body;

  if (!toUserId || !offeredSkill || !requestedSkill) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO skill_swaps (from_user_id, to_user_id, offered_skill, requested_skill, message, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.userId, toUserId, offeredSkill, requestedSkill, message || '']
    );

    const swapId = result.insertId;

    await pool.execute(
      `INSERT INTO skill_swap_status_history (swap_id, status, changed_by)
       VALUES (?, 'pending', ?)`,
      [swapId, req.userId]
    );

    res.status(201).json({ id: swapId, message: 'Swap request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Accept / Decline
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [[swap]] = await pool.execute(
      `SELECT * FROM skill_swaps WHERE id = ?`,
      [req.params.id]
    );
    if (!swap) return res.status(404).json({ error: 'Swap not found' });

    if (swap.to_user_id !== req.userId)
      return res.status(403).json({ error: 'Not authorized' });

    await pool.execute(
      `UPDATE skill_swaps SET status = ? WHERE id = ?`,
      [status, req.params.id]
    );

    await pool.execute(
      `INSERT INTO skill_swap_status_history (swap_id, status, changed_by)
       VALUES (?, ?, ?)`,
      [req.params.id, status, req.userId]
    );

    res.json({ message: `Swap ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Chat: Get messages
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const [messages] = await pool.execute(
      `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
       FROM skill_swap_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.swap_id = ?
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Chat: Send message
router.post('/:id/messages', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const [[swap]] = await pool.execute(
      `SELECT * FROM skill_swaps WHERE id = ?`,
      [req.params.id]
    );
    if (!swap) return res.status(404).json({ error: 'Swap not found' });

    if (![swap.from_user_id, swap.to_user_id].includes(req.userId))
      return res.status(403).json({ error: 'Not authorized' });

    const [result] = await pool.execute(
      `INSERT INTO skill_swap_messages (swap_id, sender_id, message)
       VALUES (?, ?, ?)`,
      [req.params.id, req.userId, message]
    );

    res.status(201).json({ id: result.insertId, message: 'Sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
