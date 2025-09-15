import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import { meetingAttendees, TInsertMeetingAttendee, TSelectMeetingAttendee } from "../../drizzle/schema";

// Get all attendees, optionally filtered by meetingId
export const getAllAttendeesServices = async (meetingId?: number): Promise<TSelectMeetingAttendee[]> => {
  const queryOptions: any = { orderBy: [desc(meetingAttendees.id)] };
  if (meetingId) {
    queryOptions.where = eq(meetingAttendees.meetingId, meetingId);
  }

  return await db.query.meetingAttendees.findMany(queryOptions);
};

// Get a single attendee by id
export const getAttendeeByIdServices = async (id: number): Promise<TSelectMeetingAttendee | undefined> => {
  return await db.query.meetingAttendees.findFirst({
    where: eq(meetingAttendees.id, id),
  });
};

// Add a new attendee
export const addAttendeeServices = async (attendee: TInsertMeetingAttendee): Promise<string> => {
  await db.insert(meetingAttendees).values(attendee).returning();
  return "Attendee added successfully!";
};

// Update an attendee by id
export const updateAttendeeServices = async (id: number, attendee: Partial<TInsertMeetingAttendee>): Promise<string> => {
  const updatedAttendee = await db
    .update(meetingAttendees)
    .set(attendee)
    .where(eq(meetingAttendees.id, id))
    .returning();

  if (!updatedAttendee.length) {
    throw new Error("Attendee not found");
  }

  return "Attendee updated successfully!";
};

// Delete an attendee by id
export const deleteAttendeeServices = async (id: number): Promise<string> => {
  const deletedCount = await db
    .delete(meetingAttendees)
    .where(eq(meetingAttendees.id, id));

  if (!deletedCount) {
    throw new Error("Attendee not found");
  }

  return "Attendee deleted successfully!";
};
