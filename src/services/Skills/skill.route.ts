// src/services/Skill/skill.route.ts
import { Router } from "express";
import {
  listSkills,
  getSkillsGrouped,
  getSkillById,
  getSkillByTechId,
  createSkill,
  updateSkill,
  upsertSkillByTech,
  deleteSkill,
} from "./skill.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const SkillRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/skills — list (paginated, filterable by category/proficiency/search)
SkillRoute.get("/", listSkills);

// GET /api/skills/grouped — grouped by tech category
SkillRoute.get("/grouped", getSkillsGrouped);

// GET /api/skills/by-tech/:techId — skill for a specific technology
SkillRoute.get("/by-tech/:techId", getSkillByTechId);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/skills — create
SkillRoute.post("/", requireAdmin, createSkill);

// PUT /api/skills/by-tech/:techId — upsert by tech (create or update)
SkillRoute.put("/by-tech/:techId", requireAdmin, upsertSkillByTech);

// PUT /api/skills/:id — update
SkillRoute.put("/:id", requireAdmin, updateSkill);

// DELETE /api/skills/:id — delete
SkillRoute.delete("/:id", requireAdmin, deleteSkill);

// ==========================================
// PUBLIC — GET BY ID (LAST — catch-all)
// ==========================================
SkillRoute.get("/:id", getSkillById);