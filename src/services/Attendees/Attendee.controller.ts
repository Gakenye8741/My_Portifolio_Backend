import { Request, Response } from "express";
import {
  getAllAttendeesServices,
  getAttendeeByIdServices,
  addAttendeeServices,
  updateAttendeeServices,
  deleteAttendeeServices,
} from "./Attendee.service";

// =======================
// GET ALL ATTENDEES
// =======================
export const getAllAttendees = async (req: Request, res: Response) => {
  const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string, 10) : undefined;

  try {
    const attendees = await getAllAttendeesServices(meetingId);
    if (!attendees || attendees.length === 0) {
       res.status(404).json({ error: "No attendees found" });
       return;
    }else{
        res.status(200).json(attendees);
    }
   
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// GET ATTENDEE BY ID
// =======================
export const getAttendeeById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)){
    res.status(400).json({ error: "Invalid attendee ID" });
    return;
  }
  try {
    const attendee = await getAttendeeByIdServices(id);
    if (!attendee) {
      res.status(404).json({ error: "Attendee not found" });
    }else{
      res.status(200).json(attendee);
    }
    
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// ADD ATTENDEE
// =======================
export const addAttendee = async (req: Request, res: Response) => {
  const { meetingId, name, email, status } = req.body;

  if (!meetingId || !name || !status) {
     res.status(400).json({ error: "Meeting ID, name, and status are required" });
     return;
  }
  try {
    const result = await addAttendeeServices({ meetingId, name, email, status });
    res.status(201).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// =======================
// UPDATE ATTENDEE
// =======================
export const updateAttendee = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid attendee ID" });
    return;
  } 

  const { name, email, status } = req.body;
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

// =======================
// DELETE ATTENDEE
// =======================
export const deleteAttendee = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid attendee ID" });
    return ;
  } 

  try {
    const result = await deleteAttendeeServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};
