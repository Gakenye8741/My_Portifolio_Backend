import { RequestHandler } from "express";
import {
  createTimelineEventService,
  getTimelineByProjectService,
  updateTimelineEventService,
  deleteTimelineEventService,
} from "./projectTimeline.service";

// ✅ Add a new milestone/event to a project
// Inside ProjectTimeline.controller.ts
export const createTimelineEvent: RequestHandler = async (req, res) => {
  try {
    const newEvent = await createTimelineEventService(req.body);
    res.status(201).json(newEvent);
  } catch (error: any) {
    console.error("DB_ERROR:", error.message); // This will show "violates foreign key" or "null value in column title"
    res.status(500).json({ error: "Failed to create timeline event", details: error.message });
  }
};

// ✅ Get all timeline events for a specific project
export const getProjectTimeline: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const timeline = await getTimelineByProjectService(projectId);
    res.status(200).json(timeline);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project timeline" });
  }
};

// ✅ Update a specific timeline event
export const updateTimelineEvent: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTimelineEventService(id, req.body);
    
    if (!updated) {
      res.status(404).json({ error: "Timeline event not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update timeline event" });
  }
};

// ✅ Delete a timeline event
export const deleteTimelineEvent: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await deleteTimelineEventService(id);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete timeline event" });
  }
};