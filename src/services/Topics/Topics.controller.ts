import { Request, Response } from "express";
import {
  getAllTopicsServices,
  getTopicsByMeetingIdServices,
  getTopicByIdServices,
  addTopicServices,
  updateTopicServices,
  deleteTopicServices,
} from "./Topics.service";

// =======================
// GET ALL TOPICS
// =======================
export const getAllTopics = async (req: Request, res: Response) => {
  const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string, 10) : undefined;

  try {
    const topics = await getAllTopicsServices(meetingId);
    if (!topics || topics.length === 0) {
      res.status(404).json({ error: "No topics found" });
      return;
    } else {
      res.status(200).json(topics);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// GET TOPICS BY MEETING ID
// =======================
export const getTopicsByMeetingId = async (req: Request, res: Response) => {
  const meetingId = parseInt(req.params.meetingId, 10);
  if (isNaN(meetingId)) {
    res.status(400).json({ error: "Invalid meeting ID" });
    return;
  }

  try {
    const topics = await getTopicsByMeetingIdServices(meetingId);
    if (!topics || topics.length === 0) {
      res.status(404).json({ error: "No topics found for this meeting" });
    } else {
      res.status(200).json(topics);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// GET TOPIC BY ID
// =======================
export const getTopicById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid topic ID" });
    return;
  }

  try {
    const topic = await getTopicByIdServices(id);
    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
    } else {
      res.status(200).json(topic);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// ADD TOPIC
// =======================
export const addTopic = async (req: Request, res: Response) => {
  const { meetingId, subject, notes, decisions, actions } = req.body;

  if (!meetingId || !subject) {
    res.status(400).json({ error: "Meeting ID and subject are required" });
    return;
  }

  try {
    const result = await addTopicServices({ meetingId, subject, notes, decisions, actions });
    res.status(201).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// UPDATE TOPIC
// =======================
export const updateTopic = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid topic ID" });
    return;
  }

  const { subject, notes, decisions, actions } = req.body;
  const updates: Partial<any> = {};
  if (subject !== undefined) updates.subject = subject;
  if (notes !== undefined) updates.notes = notes;
  if (decisions !== undefined) updates.decisions = decisions;
  if (actions !== undefined) updates.actions = actions;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided for update" });
    return;
  }

  try {
    const result = await updateTopicServices(id, updates);
    res.status(200).json({ message: result, updatedFields: updates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// DELETE TOPIC
// =======================
export const deleteTopic = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid topic ID" });
    return;
  }

  try {
    const result = await deleteTopicServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};
