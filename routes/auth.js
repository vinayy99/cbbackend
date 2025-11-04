import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/config.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, skills, bio } = req.body;

  if (!name || !email || !password || !skills || !Array.isArray(skills)) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, bio, avatar, available) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, bio || '', `https://picsum.photos/seed/${name.split(' ')[0]}/200`, true]
    );

    const userId = result.insertId;

    // Insert user skills
    for (const skill of skills) {
      await pool.execute(
        'INSERT INTO user_skills (user_id, skill) VALUES (?, ?)',
        [userId, skill]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET || 'your_secret_key_here',
      { expiresIn: '7d' }
    );

    // Fetch created user with skills
    const [userRows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const [skillRows] = await pool.execute(
      'SELECT skill FROM user_skills WHERE user_id = ?',
      [userId]
    );

    const user = userRows[0];
    user.skills = skillRows.map(row => row.skill);
    delete user.password;

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user skills
    const [skillRows] = await pool.execute(
      'SELECT skill FROM user_skills WHERE user_id = ?',
      [user.id]
    );

    user.skills = skillRows.map(row => row.skill);
    delete user.password;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key_here',
      { expiresIn: '7d' }
    );

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

