import { Router } from "express";
import {
  getAllAttendees,
  getAttendeeById,
  addAttendee,
  updateAttendee,
  deleteAttendee,
} from "./Attendee.controller";

const attendeesRouter = Router();

// GET all attendees (optional query: ?meetingId=1)
attendeesRouter.get("/AllAttendees", getAllAttendees);

// GET a single attendee by ID
attendeesRouter.get("/AttendeeById/:id", getAttendeeById);

// ADD a new attendee
attendeesRouter.post("/AddAttendee", addAttendee);

// UPDATE an attendee by ID
attendeesRouter.put("/UpdateAttendee/:id", updateAttendee);

// DELETE an attendee by ID
attendeesRouter.delete("/DeleteAttendee/:id", deleteAttendee);

export default attendeesRouter;
