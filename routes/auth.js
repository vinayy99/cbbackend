import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/config.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, skills, bio } = req.body;

  if (!name || !email || !password || !skills) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [exists] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (exists.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const skillList = Array.isArray(skills)
      ? skills
      : skills.split(',').map(s => s.trim()).filter(Boolean);

    const hashed = await hashPassword(password);

    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password, bio, avatar, available) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashed, bio || "", `https://robohash.org/${name}`, true]
    );

    const userId = result.insertId;

    for (const skill of skillList) {
      await pool.execute(
        "INSERT INTO user_skills (user_id, skill) VALUES (?, ?)",
        [userId, skill]
      );
    }

    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    const [u] = await pool.execute(
      "SELECT id, name, email, bio, avatar, available FROM users WHERE id = ?",
      [userId]
    );

    const user = u[0];
    user.skills = skillList;

    res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

    const user = rows[0];
    const match = await comparePassword(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const [skillRows] = await pool.execute("SELECT skill FROM user_skills WHERE user_id = ?", [user.id]);
    user.skills = skillRows.map(s => s.skill);
    delete user.password;

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });

    res.json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
