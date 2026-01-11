import { Router } from "express";
import { 
  createTimelineEvent, 
  getProjectTimeline, 
  updateTimelineEvent, 
  deleteTimelineEvent 
} from "./ProjectTimeline.controller";

export const ProjectTimelineRoute = Router();

// Get the full history for a project
// GET /api/project-timeline/project/:projectId
ProjectTimelineRoute.get("/project/:projectId", getProjectTimeline);

// Standard CRUD
ProjectTimelineRoute.post("/", createTimelineEvent);
ProjectTimelineRoute.put("/:id", updateTimelineEvent);
ProjectTimelineRoute.delete("/:id", deleteTimelineEvent);