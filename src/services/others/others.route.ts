import { Router } from "express";
import {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getAttendeesByMeetingId,
  addAttendee,
  updateAttendee,
  deleteAttendee,
  getTopicsByMeetingId,
  addTopic,
  updateTopic,
  deleteTopic,
  getSignaturesByMeetingId,
  addSignature,
  deleteSignature,
  updateAttendeeStatus,
} from "./others.controller";

const meetingRouter = Router();

// =======================
// MEETINGS
// =======================
meetingRouter.get("/AllMeetings", getAllMeetings);
meetingRouter.get("/MeetingById/:id", getMeetingById);
meetingRouter.post("/CreateMeeting", createMeeting);
meetingRouter.put("/UpdateMeeting/:id", updateMeeting);
meetingRouter.delete("/DeleteMeeting/:id", deleteMeeting);
meetingRouter.patch("/UpdateAttendeeStatus/:id", updateAttendeeStatus);


// =======================
// ATTENDEES
// =======================
meetingRouter.get("/AttendeesByMeetingId/:meetingId", getAttendeesByMeetingId);
meetingRouter.post("/AddAttendee", addAttendee);
meetingRouter.put("/UpdateAttendee/:id", updateAttendee);
meetingRouter.delete("/DeleteAttendee/:id", deleteAttendee);

// =======================
// TOPICS
// =======================
meetingRouter.get("/TopicsByMeetingId/:meetingId", getTopicsByMeetingId);
meetingRouter.post("/AddTopic", addTopic);
meetingRouter.put("/UpdateTopic/:id", updateTopic);
meetingRouter.delete("/DeleteTopic/:id", deleteTopic);

// =======================
// SIGNATURES
// =======================
meetingRouter.get("/SignaturesByMeetingId/:meetingId", getSignaturesByMeetingId);
meetingRouter.post("/AddSignature", addSignature);
meetingRouter.delete("/DeleteSignature/:id", deleteSignature);

export default meetingRouter;
