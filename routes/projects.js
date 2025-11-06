import express from "express";
import { pool } from "../database/config.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Helper to hydrate project data safely
async function hydrateProject(project) {
  // Required Skills
  const [skillRows] = await pool.execute(
    "SELECT skill FROM project_skills WHERE project_id = ?",
    [project.id]
  );
  project.requiredSkills = skillRows.map((row) => row.skill) || [];

  // Members
  const [memberRows] = await pool.execute(
    "SELECT user_id FROM project_members WHERE project_id = ?",
    [project.id]
  );
  project.members = memberRows.map((row) => row.user_id) || [];

  // Creator Info (safe fallback)
  const [creatorRows] = await pool.execute(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [project.creator_id]
  );
  project.creator = creatorRows[0] || {
    id: null,
    name: "Unknown User",
    avatar: "https://robohash.org/placeholder",
  };

  return project;
}

// ✅ Get all projects (Discover Page)
router.get("/", async (req, res) => {
  try {
    const [projects] = await pool.execute(
      "SELECT * FROM projects ORDER BY created_at DESC"
    );

    const hydrated = [];
    for (const project of projects) {
      hydrated.push(await hydrateProject(project));
    }

    res.json(hydrated);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get single project
router.get("/:id", async (req, res) => {
  try {
    const [projects] = await pool.execute(
      "SELECT * FROM projects WHERE id = ?",
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = await hydrateProject(projects[0]);
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Create new project
router.post("/", authMiddleware, async (req, res) => {
  const { title, description, requiredSkills } = req.body;

  if (!title || !description || !requiredSkills || !Array.isArray(requiredSkills)) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO projects (title, description, creator_id) VALUES (?, ?, ?)",
      [title, description, req.userId]
    );

    const projectId = result.insertId;

    for (const skill of requiredSkills) {
      await pool.execute(
        "INSERT INTO project_skills (project_id, skill) VALUES (?, ?)",
        [projectId, skill]
      );
    }

    await pool.execute(
      "INSERT INTO project_members (project_id, user_id) VALUES (?, ?)",
      [projectId, req.userId]
    );

    const [projects] = await pool.execute(
      "SELECT * FROM projects WHERE id = ?",
      [projectId]
    );

    const project = await hydrateProject(projects[0]);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Join project
router.post("/:id/join", authMiddleware, async (req, res) => {
  try {
    const [existingMembers] = await pool.execute(
      "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );

    if (existingMembers.length > 0) {
      return res.status(400).json({ error: "Already a member of this project" });
    }

    await pool.execute(
      "INSERT INTO project_members (project_id, user_id) VALUES (?, ?)",
      [req.params.id, req.userId]
    );

    res.json({ message: "Successfully joined project" });
  } catch (error) {
    console.error("Error joining project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
