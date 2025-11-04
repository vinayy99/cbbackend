import express from 'express';
import { pool } from '../database/config.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT * FROM users');
    
    for (const user of users) {
      const [skillRows] = await pool.execute(
        'SELECT skill FROM user_skills WHERE user_id = ?',
        [user.id]
      );
      user.skills = skillRows.map(row => row.skill);
      delete user.password;
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const [skillRows] = await pool.execute(
      'SELECT skill FROM user_skills WHERE user_id = ?',
      [user.id]
    );
    
    user.skills = skillRows.map(row => row.skill);
    delete user.password;

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle user availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT available FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAvailability = !users[0].available;

    await pool.execute(
      'UPDATE users SET available = ? WHERE id = ?',
      [newAvailability, req.params.id]
    );

    res.json({ available: newAvailability });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

