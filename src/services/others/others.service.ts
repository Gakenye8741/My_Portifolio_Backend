import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import {
  meetings,
  TInsertMeeting,
  TSelectMeeting,
  meetingAttendees,
  TInsertMeetingAttendee,
  TSelectMeetingAttendee,
  topics,
  TInsertTopic,
  TSelectTopic,
  signatures,
  TInsertSignature,
  TSelectSignature,
} from "../../drizzle/schema";

// =======================
// MEETINGS
// =======================

// Get all meetings, newest first
export const getAllMeetingsServices = async (): Promise<TSelectMeeting[]> => {
  return await db.query.meetings.findMany({
    orderBy: [desc(meetings.date)],
  });
};

// Get meeting by ID
export const getMeetingByIdServices = async (id: number): Promise<TSelectMeeting | undefined> => {
  return await db.query.meetings.findFirst({
    where: eq(meetings.id, id),
  });
};

// Create a new meeting
export const createMeetingServices = async (meeting: TInsertMeeting): Promise<string> => {
  await db.insert(meetings).values(meeting).returning();
  return "Meeting Created Successfully!";
};

// Update a meeting
export const updateMeetingServices = async (
  id: number,
  meeting: Partial<TInsertMeeting>
): Promise<string> => {
  const updatedMeeting = await db
    .update(meetings)
    .set(meeting)
    .where(eq(meetings.id, id))
    .returning();

  if (!updatedMeeting.length) {
    throw new Error("Meeting not found");
  }

  return "Meeting Updated Successfully!";
};

// Delete a meeting
export const deleteMeetingServices = async (id: number): Promise<string> => {
  const deletedCount = await db
    .delete(meetings)
    .where(eq(meetings.id, id));

  if (!deletedCount) {
    throw new Error("Meeting not found");
  }

  return "Meeting Deleted Successfully!";
};

// =======================
// MEETING ATTENDEES
// =======================

// Get attendees for a meeting
export const getAttendeesByMeetingIdServices = async (
  meetingId: number
): Promise<TSelectMeetingAttendee[]> => {
  return await db.query.meetingAttendees.findMany({
    where: eq(meetingAttendees.meetingId, meetingId),
  });
};

// Add an attendee
export const addAttendeeServices = async (
  attendee: TInsertMeetingAttendee
): Promise<string> => {
  await db.insert(meetingAttendees).values(attendee).returning();
  return "Attendee Added Successfully!";
};

// Update attendee status
export const updateAttendeeServices = async (
  id: number,
  attendee: Partial<TInsertMeetingAttendee>
): Promise<string> => {
  const updated = await db.update(meetingAttendees).set(attendee).where(eq(meetingAttendees.id, id)).returning();
  if (!updated.length) throw new Error("Attendee not found");
  return "Attendee Updated Successfully!";
};

// Delete attendee
export const deleteAttendeeServices = async (id: number): Promise<string> => {
  const deletedCount = await db.delete(meetingAttendees).where(eq(meetingAttendees.id, id));
  if (!deletedCount) throw new Error("Attendee not found");
  return "Attendee Deleted Successfully!";
};

// =======================
// TOPICS
// =======================

// Get topics for a meeting
export const getTopicsByMeetingIdServices = async (meetingId: number): Promise<TSelectTopic[]> => {
  return await db.query.topics.findMany({
    where: eq(topics.meetingId, meetingId),
  });
};

// Add a topic
export const addTopicServices = async (topic: TInsertTopic): Promise<string> => {
  await db.insert(topics).values(topic).returning();
  return "Topic Added Successfully!";
};

// Update a topic
export const updateTopicServices = async (id: number, topic: Partial<TInsertTopic>): Promise<string> => {
  const updated = await db.update(topics).set(topic).where(eq(topics.id, id)).returning();
  if (!updated.length) throw new Error("Topic not found");
  return "Topic Updated Successfully!";
};

// Delete a topic
export const deleteTopicServices = async (id: number): Promise<string> => {
  const deletedCount = await db.delete(topics).where(eq(topics.id, id));
  if (!deletedCount) throw new Error("Topic not found");
  return "Topic Deleted Successfully!";
};

// =======================
// SIGNATURES
// =======================

// Get signatures for a meeting
export const getSignaturesByMeetingIdServices = async (
  meetingId: number
): Promise<TSelectSignature[]> => {
  return await db.query.signatures.findMany({
    where: eq(signatures.meetingId, meetingId),
    with : {
      user: true,
    }
  });
};

// Add a signature
export const addSignatureServices = async (signature: TInsertSignature): Promise<string> => {
  await db.insert(signatures).values(signature).returning();
  return "Signature Added Successfully!";
};

// Delete a signature
export const deleteSignatureServices = async (id: number): Promise<string> => {
  const deletedCount = await db.delete(signatures).where(eq(signatures.id, id));
  if (!deletedCount) throw new Error("Signature not found");
  return "Signature Deleted Successfully!";
};
