// src/services/Technology/technology.route.ts
import { Router } from "express";
import {
  listTechnologies,
  getTechnologiesByCategory,
  getTechnologiesByIds,
  getTechnologyById,
  getTechnologyUsage,
  createTechnology,
  updateTechnology,
  deleteTechnology,
} from "./technology.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const TechnologyRoute = Router();

// ==========================================
// PUBLIC — READ
// ==========================================

// GET /api/technologies — list
TechnologyRoute.get("/", listTechnologies);

// GET /api/technologies/by-category — grouped by category
TechnologyRoute.get("/by-category", getTechnologiesByCategory);

// GET /api/technologies/bulk?ids=... — bulk fetch
TechnologyRoute.get("/bulk", getTechnologiesByIds);

// ==========================================
// ADMIN — READ
// ==========================================

// GET /api/technologies/:id/usage — usage before delete
TechnologyRoute.get("/:id/usage", requireAdmin, getTechnologyUsage);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/technologies
TechnologyRoute.post("/", requireAdmin, createTechnology);

// PUT /api/technologies/:id
TechnologyRoute.put("/:id", requireAdmin, updateTechnology);

// DELETE /api/technologies/:id
TechnologyRoute.delete("/:id", requireAdmin, deleteTechnology);

// ==========================================
// PUBLIC — GET BY ID (LAST — catch-all)
// ==========================================
TechnologyRoute.get("/:id", getTechnologyById);