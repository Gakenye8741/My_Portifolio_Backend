// src/services/Project/project.route.ts
import { Router } from "express";
import {
  // public
  listProjects,
  getProjectBySlug,
  // admin read
  getProjectById,
  getProjectStats,
  // admin write
  createProject,
  updateProject,
  toggleProjectFeatured,
  updateProjectStatus,
  deleteProject,
  restoreProject,
  hardDeleteProject,
} from "./Project.controller";
import { requireAdmin } from "../../middlewares/bearAuth";

export const ProjectsRoute = Router();

// ==========================================
// PUBLIC
// ==========================================

// GET /api/projects — list + filter + paginate
ProjectsRoute.get("/", listProjects);

// GET /api/projects/slug/:slug — single project (increments view)
ProjectsRoute.get("/slug/:slug", getProjectBySlug);

// ==========================================
// ADMIN — READ (must be before /:id catch-all)
// ==========================================

// GET /api/projects/admin/stats
ProjectsRoute.get("/admin/stats", requireAdmin, getProjectStats);

// ==========================================
// ADMIN — WRITE
// ==========================================

// POST /api/projects
ProjectsRoute.post("/", requireAdmin, createProject);

// PUT /api/projects/:id
ProjectsRoute.put("/:id", requireAdmin, updateProject);

// PATCH /api/projects/:id/featured
ProjectsRoute.patch("/:id/featured", requireAdmin, toggleProjectFeatured);

// PATCH /api/projects/:id/status
ProjectsRoute.patch("/:id/status", requireAdmin, updateProjectStatus);

// DELETE /api/projects/:id — soft delete
ProjectsRoute.delete("/:id", requireAdmin, deleteProject);

// POST /api/projects/:id/restore
ProjectsRoute.post("/:id/restore", requireAdmin, restoreProject);

// DELETE /api/projects/:id/hard — permanent
ProjectsRoute.delete("/:id/hard", requireAdmin, hardDeleteProject);

// ==========================================
// ADMIN — GET BY ID (LAST — catch-all)
// ==========================================
// Placed at the bottom so `/admin/stats` etc. match first
ProjectsRoute.get("/:id", requireAdmin, getProjectById);