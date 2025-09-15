import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import { topics, TInsertTopic, TSelectTopic } from "../../drizzle/schema";

// ==========================
// TOPIC SERVICES
// ==========================

// Get all topics (optionally filter by meetingId)
export const getAllTopicsServices = async (meetingId?: number) => {
  const queryOptions: any = {
    orderBy: [desc(topics.id)],
    with: {
      meeting: {
        with: {
          attendees: true, // ✅ include related attendees of the meeting
        },
      },
    },
  };

  if (meetingId) {
    queryOptions.where = eq(topics.meetingId, meetingId);
  }

  return await db.query.topics.findMany(queryOptions);
};

// Get topics by meetingId (explicit version)
export const getTopicsByMeetingIdServices = async (meetingId: number): Promise<TSelectTopic[]> => {
  return await db.query.topics.findMany({
    where: eq(topics.meetingId, meetingId),
    orderBy: [desc(topics.id)],
    with: {
      meeting: {
        with: {
          attendees: true, // ✅ meeting + attendees
        },
      },
    },
  });
};

// Get a single topic by id
export const getTopicByIdServices = async (id: number) => {
  return await db.query.topics.findFirst({
    where: eq(topics.id, id),
    with: {
      meeting: {
        with: {
          attendees: true, // ✅ also include attendees
        },
      },
    },
  });
};

// Add a new topic
export const addTopicServices = async (topic: TInsertTopic): Promise<string> => {
  await db.insert(topics).values(topic).returning();
  return "Topic added successfully!";
};

// Update a topic by id
export const updateTopicServices = async (
  id: number,
  topic: Partial<TInsertTopic>
): Promise<string> => {
  const updatedTopic = await db
    .update(topics)
    .set(topic)
    .where(eq(topics.id, id))
    .returning();

  if (!updatedTopic.length) {
    throw new Error("Topic not found");
  }

  return "Topic updated successfully!";
};

// Delete a topic by id
export const deleteTopicServices = async (id: number): Promise<string> => {
  const deletedCount = await db.delete(topics).where(eq(topics.id, id));

  if (!deletedCount) {
    throw new Error("Topic not found");
  }

  return "Topic deleted successfully!";
};
