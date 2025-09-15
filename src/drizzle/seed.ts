import db from "./db"; // your drizzle db instance
import bcrypt from "bcrypt";
import {
  users,
  meetings,
  meetingAttendees,
  topics,
  signatures,
  TInsertUser,
  TInsertMeeting,
  TInsertMeetingAttendee,
  TInsertTopic,
  TInsertSignature,
} from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // ==========================
  // USERS (Secretary + Chairman)
  // ==========================
  const salt = bcrypt.genSaltSync(10);

  const userData: TInsertUser[] = [
    {
      fullName: "Alice Secretary",
      username: "secretary",
      email: "secretary@club.com",
      password: bcrypt.hashSync("password123", salt),
      role: "Secretary General",
    },
    {
      fullName: "Bob President",
      username: "president",
      email: "president@club.com",
      password: bcrypt.hashSync("password123", salt),
      role: "Chairman",
    },
  ];

  const insertedUsers = await db.insert(users).values(userData).returning();
  const secretary = insertedUsers.find((u) => u.role === "Secretary General")!;
  const president = insertedUsers.find((u) => u.role === "Chairman")!;

  // ==========================
  // MEETINGS
  // ==========================
  const meetingData: TInsertMeeting = {
    title: "First Club Meeting",
    date: "2025-09-12T16:00:00Z",
    createdBy: secretary.id,
  };

  const [meeting] = await db.insert(meetings).values(meetingData).returning();

  // ==========================
  // ATTENDEES REGISTER
  // ==========================
  const attendeesData: TInsertMeetingAttendee[] = [
    { meetingId: meeting.id, name: "Charlie Kim", email: "charlie@example.com", status: "Present" },
    { meetingId: meeting.id, name: "Diana Lopez", email: "diana@example.com", status: "Present" },
    { meetingId: meeting.id, name: "Ethan Wright", email: "ethan@example.com", status: "Late" },
    { meetingId: meeting.id, name: "Fiona Green", email: "fiona@example.com", status: "Absent" },
  ];

  await db.insert(meetingAttendees).values(attendeesData);

  // ==========================
  // TOPICS
  // ==========================
  const topicsData: TInsertTopic[] = [
    {
      meetingId: meeting.id,
      subject: "Welcome & Introduction",
      notes: "Secretary welcomed everyone to the first club meeting.",
      decisions: "Agreed on regular meeting schedule.",
      actions: "Secretary to circulate finalized schedule.",
    },
    {
      meetingId: meeting.id,
      subject: "Budget Discussion",
      notes: "President presented proposed budget and collected feedback.",
      decisions: "Budget was approved unanimously.",
      actions: "Treasurer to finalize and submit by next week.",
    },
  ];

  await db.insert(topics).values(topicsData);

  // ==========================
  // SIGNATURES
  // ==========================
  const signaturesData: TInsertSignature[] = [
    {
      meetingId: meeting.id,
      signedBy: secretary.id,
      role: "Secretary General",
    },
    {
      meetingId: meeting.id,
      signedBy: president.id,
      role: "Chairman",
    },
  ];

  await db.insert(signatures).values(signaturesData);

  console.log("✅ Seeding completed!");
}

seed().catch((err) => {
  console.error("❌ Error seeding database:", err);
  process.exit(1);
});
