import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  boolean
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================
// ENUMS
// ==========================
export const userRole = pgEnum("user_role", ["Secretary General", "Chairman"]); // ✅ consistent casing
export const attendanceStatus = pgEnum("attendance_status", ["Present", "Absent", "Late"]);

export type AttendanceStatus = "Present" | "Absent" | "Late";

// ==========================
// TABLES
// ==========================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRole("role").notNull(),
  isActive: boolean("isActive").default(true), // <-- NEW
  createdAt: timestamp("createdAt").defaultNow(),
});


export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date").notNull(),
  createdBy: integer("createdBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const meetingAttendees = pgTable("meetingAttendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meetingId").references(() => meetings.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  status: attendanceStatus("status").notNull(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  meetingId: integer("meetingId").references(() => meetings.id).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  notes: text("notes"),
  decisions: text("decisions"),
  actions: text("actions"),
});

export const signatures = pgTable("signatures", {
  id: serial("id").primaryKey(),
  meetingId: integer("meetingId").references(() => meetings.id).notNull(),
  signedBy: integer("signedBy").references(() => users.id).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  signedAt: timestamp("signedAt").defaultNow(),
});

// ==========================
// RELATIONS
// ==========================
export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
  signatures: many(signatures),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  creator: one(users, { fields: [meetings.createdBy], references: [users.id] }),
  attendees: many(meetingAttendees),
  topics: many(topics),
  signatures: many(signatures),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAttendees.meetingId], references: [meetings.id] }),
}));

export const topicsRelations = relations(topics, ({ one }) => ({
  meeting: one(meetings, { fields: [topics.meetingId], references: [meetings.id] }),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
  meeting: one(meetings, { fields: [signatures.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [signatures.signedBy], references: [users.id] }),
}));

// ==========================
// TYPES
// ==========================
export type TSelectUser = typeof users.$inferSelect;
export type TInsertUser = typeof users.$inferInsert;

export type TSelectMeeting = typeof meetings.$inferSelect;
export type TInsertMeeting = typeof meetings.$inferInsert;

export type TSelectMeetingAttendee = typeof meetingAttendees.$inferSelect;
export type TInsertMeetingAttendee = typeof meetingAttendees.$inferInsert;

export type TSelectTopic = typeof topics.$inferSelect;
export type TInsertTopic = typeof topics.$inferInsert;

export type TSelectSignature = typeof signatures.$inferSelect;
export type TInsertSignature = typeof signatures.$inferInsert;
