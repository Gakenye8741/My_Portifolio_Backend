CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Late');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Secretary General', 'Chairman');--> statement-breakpoint
CREATE TABLE "meetingAttendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"status" "attendance_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" varchar NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"signedBy" integer NOT NULL,
	"role" varchar(100) NOT NULL,
	"signedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"notes" text,
	"decisions" text,
	"actions" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(100) NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "meetingAttendees" ADD CONSTRAINT "meetingAttendees_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_signedBy_users_id_fk" FOREIGN KEY ("signedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;