import { Router } from "express";
import {
  getAllProjects,
  getProjectById,
  getProjectBySlug,
  getProjectWithThumbnail,
  createProject,
  updateProject,
  deleteProject,
} from "./Project.controller";

export const ProjectsRoute = Router();

// 📁 Project Routes (Base path: /api/projects)

// ✅ Get all projects -> GET /api/projects
ProjectsRoute.get("/", getAllProjects);

// 🔗 Get project by Slug -> GET /api/projects/slug/:slug
// Placing this BEFORE /:id ensures "slug" isn't mistaken for a UUID
ProjectsRoute.get("/slug/:slug", getProjectBySlug);

// 🆔 Get project by ID -> GET /api/projects/:id
ProjectsRoute.get("/:id", getProjectById);

// 🔍 Get project with full details -> GET /api/projects/:id/details
ProjectsRoute.get("/:id/details", getProjectWithThumbnail);

// ✍️ Create a new project -> POST /api/projects
ProjectsRoute.post("/", createProject);

// 🔄 Update a project -> PUT /api/projects/:id
ProjectsRoute.put("/:id", updateProject);

// ❌ Delete a project -> DELETE /api/projects/:id
ProjectsRoute.delete("/:id", deleteProject);