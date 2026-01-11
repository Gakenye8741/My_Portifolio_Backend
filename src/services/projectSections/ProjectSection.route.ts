import { Router } from "express";
import { 
  createSection, 
  getProjectSections, 
  reorderSections, 
  updateSection, 
  deleteSection 
} from "./ProjectSection.controller";

export const ProjectSectionRoute = Router();

// Project-specific routes
ProjectSectionRoute.get("/project/:projectId", getProjectSections);
ProjectSectionRoute.post("/reorder", reorderSections);

// CRUD
ProjectSectionRoute.post("/", createSection);
ProjectSectionRoute.put("/:id", updateSection);
ProjectSectionRoute.delete("/:id", deleteSection);