import { Router } from "express";
import {
  getAllTopics,
  getTopicsByMeetingId,
  getTopicById,
  addTopic,
  updateTopic,
  deleteTopic,
} from "./Topics.controller";

const topicsRouter = Router();

// GET all topics (optional query: ?meetingId=1)
topicsRouter.get("/AllTopics", getAllTopics);

// GET topics by meeting ID
topicsRouter.get("/MeetingTopics/:meetingId", getTopicsByMeetingId);

// GET a single topic by ID
topicsRouter.get("/TopicById/:id", getTopicById);

// ADD a new topic
topicsRouter.post("/AddTopic", addTopic);

// UPDATE a topic by ID
topicsRouter.put("/UpdateTopic/:id", updateTopic);

// DELETE a topic by ID
topicsRouter.delete("/DeleteTopic/:id", deleteTopic);

export default topicsRouter;
