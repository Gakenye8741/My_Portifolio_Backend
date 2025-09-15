import { Request, Response } from "express";
import {
  getAllMeetingsServices,
  getMeetingByIdServices,
  createMeetingServices,
  updateMeetingServices,
  deleteMeetingServices,
  getAttendeesByMeetingIdServices,
  addAttendeeServices,
  updateAttendeeServices,
  deleteAttendeeServices,
  getTopicsByMeetingIdServices,
  addTopicServices,
  updateTopicServices,
  deleteTopicServices,
  getSignaturesByMeetingIdServices,
  addSignatureServices,
  deleteSignatureServices,
} from "./others.service";

// =======================
// GET ALL MEETINGS
// =======================
export const getAllMeetings = async (req: Request, res: Response) => {
  try {
    const allMeetings = await getAllMeetingsServices();
    if (!allMeetings || allMeetings.length === 0) {
      res.status(404).json({ error: "No meetings found" });
      return;
    }
    res.status(200).json(allMeetings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// GET MEETING BY ID
// =======================
export const getMeetingById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid meeting ID" });
    return;
  }

  try {
    const meeting = await getMeetingByIdServices(id);
    if (!meeting) {
      res.status(404).json({ message: "No meeting with that ID was found" });
      return;
    }
    res.status(200).json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// CREATE MEETING
// =======================
export const createMeeting = async (req: Request, res: Response) => {
  const { title, date, createdBy } = req.body;

  if (!title || !date || !createdBy) {
    res.status(400).json({ error: "All fields are required!" });
    return;
  }

  try {
    const createdMeeting = await createMeetingServices({ title, date, createdBy });
    res.status(201).json({ message: createdMeeting });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// UPDATE MEETING
// =======================
export const updateMeeting = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Enter a valid meeting ID" });
    return;
  }

  const { title, date } = req.body;
  const updates: Partial<any> = {};
  if (title !== undefined) updates.title = title;
  if (date !== undefined) updates.date = date;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided for update" });
    return;
  }

  try {
    const result = await updateMeetingServices(id, updates);
    res.status(200).json({ message: result, updatedFields: updates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// DELETE MEETING
// =======================
export const deleteMeeting = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Please enter a valid meeting ID" });
    return;
  }

  try {
    const result = await deleteMeetingServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// MEETING ATTENDEES
// =======================
export const getAttendeesByMeetingId = async (req: Request, res: Response) => {
  const meetingId = parseInt(req.params.meetingId, 10);
  if (isNaN(meetingId)) {
    res.status(400).json({ error: "Invalid meeting ID" });
    return;
  }

  try {
    const attendees = await getAttendeesByMeetingIdServices(meetingId);
    if (!attendees || attendees.length === 0) {
      res.status(404).json({ message: "No attendees found" });
      return;
    }
    res.status(200).json(attendees);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// UPDATE ATTENDEE STATUS
// =======================
export const updateAttendeeStatus = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid attendee ID" });
    return;
  }

  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }

  try {
    const result = await updateAttendeeServices(id, { status }); // ✅ reuse your service
    res.status(200).json({ message: result, updatedStatus: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const addAttendee = async (req: Request, res: Response) => {
  const { meetingId, name, email, status } = req.body;

  if (!meetingId || !name || !status) {
    res.status(400).json({ error: "meetingId, name and status are required" });
    return;
  }

  try {
    const result = await addAttendeeServices({ meetingId, name, email, status });
    res.status(201).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const updateAttendee = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { name, email, status } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid attendee ID" });
    return;
  }

  const updates: Partial<any> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided for update" });
    return;
  }

  try {
    const result = await updateAttendeeServices(id, updates);
    res.status(200).json({ message: result, updatedFields: updates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const deleteAttendee = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid attendee ID" });
    return;
  }

  try {
    const result = await deleteAttendeeServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// TOPICS
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
      res.status(404).json({ message: "No topics found" });
      return;
    }
    res.status(200).json(topics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const addTopic = async (req: Request, res: Response) => {
  const { meetingId, subject, notes, decisions, actions } = req.body;

  if (!meetingId || !subject) {
    res.status(400).json({ error: "meetingId and subject are required" });
    return;
  }

  try {
    const result = await addTopicServices({ meetingId, subject, notes, decisions, actions });
    res.status(201).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { subject, notes, decisions, actions } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid topic ID" });
    return;
  }

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

// =======================
// SIGNATURES
// =======================
export const getSignaturesByMeetingId = async (req: Request, res: Response) => {
  const meetingId = parseInt(req.params.meetingId, 10);
  if (isNaN(meetingId)) {
    res.status(400).json({ error: "Invalid meeting ID" });
    return;
  }

  try {
    const signatures = await getSignaturesByMeetingIdServices(meetingId);
    if (!signatures || signatures.length === 0) {
      res.status(404).json({ message: "No signatures found" });
      return;
    }
    res.status(200).json(signatures);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const addSignature = async (req: Request, res: Response) => {
  const { meetingId, signedBy, role } = req.body;

  if (!meetingId || !signedBy || !role) {
    res.status(400).json({ error: "meetingId, signedBy and role are required" });
    return;
  }

  try {
    const result = await addSignatureServices({ meetingId, signedBy, role });
    res.status(201).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

export const deleteSignature = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid signature ID" });
    return;
  }

  try {
    const result = await deleteSignatureServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};
