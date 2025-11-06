import express from "express";
import { pool } from "../database/config.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get all skill swaps for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ss.*, 
      u1.name AS from_user_name, u1.avatar AS from_user_avatar,
      u2.name AS to_user_name, u2.avatar AS to_user_avatar
      FROM skill_swaps ss
      JOIN users u1 ON ss.from_user_id = u1.id
      JOIN users u2 ON ss.to_user_id = u2.id
      WHERE ss.from_user_id = ? OR ss.to_user_id = ?
      ORDER BY ss.created_at DESC`,
      [req.userId, req.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching skill swaps:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create skill swap request
router.post("/", authMiddleware, async (req, res) => {
  const { toUserId, offeredSkill, requestedSkill, message } = req.body;

  if (!toUserId || !offeredSkill || !requestedSkill) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await pool.execute(
      `INSERT INTO skill_swaps (from_user_id, to_user_id, skill_offered, skill_requested, message) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, toUserId, offeredSkill, requestedSkill, message || ""]
    );

    res.status(201).json({ message: "Skill swap request sent!" });
  } catch (error) {
    console.error("Error creating skill swap:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update status (accept/decline)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!["open", "matched", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    await pool.execute(
      `UPDATE skill_swaps SET status = ? WHERE id = ? AND to_user_id = ?`,
      [status, req.params.id, req.userId]
    );

    res.json({ message: "Status updated" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
