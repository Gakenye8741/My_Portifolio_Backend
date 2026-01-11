import { Router } from "express";
import {
  getProjectTechs,
  addTechsToProject,
  syncProjectTechs,
  removeTechFromProject
} from "./projectTech.controller";

export const ProjectTechRoute = Router();

// Get all tech for a project
ProjectTechRoute.get("/:projectId", getProjectTechs);

// Sync all tech (Replace old list with new list)
ProjectTechRoute.put("/:projectId/sync", syncProjectTechs);

// Add more tech to existing list
ProjectTechRoute.post("/:projectId", addTechsToProject);

// Remove a specific tech from a project
ProjectTechRoute.delete("/:projectId/:technologyId", removeTechFromProject);