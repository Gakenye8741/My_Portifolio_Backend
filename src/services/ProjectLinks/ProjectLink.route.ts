import { Router } from "express";
import { 
  getProjectLinks, 
  createLink, 
  syncLinks, 
  updateLink, 
  deleteLink 
} from "./ProjectLink.controller";

export const ProjectLinkRoute = Router();

// GET /api/project-links/project/:projectId
ProjectLinkRoute.get("/project/:projectId", getProjectLinks);

// POST /api/project-links/project/:projectId/sync
ProjectLinkRoute.post("/project/:projectId/sync", syncLinks);

// Standard CRUD
ProjectLinkRoute.post("/", createLink);
ProjectLinkRoute.put("/:id", updateLink);
ProjectLinkRoute.delete("/:id", deleteLink);