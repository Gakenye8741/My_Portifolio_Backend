CREATE TYPE "public"."message_status" AS ENUM('new', 'read', 'replied', 'archived');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" uuid,
	"diff" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" varchar(255) NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"visitor_id" varchar(100) NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reaction" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"edited_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"page_id" uuid,
	"meta_title" varchar(255),
	"meta_description" text,
	"og_image_id" uuid,
	"canonical_url" text,
	"no_index" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"icon_name" varchar(50) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "project_views" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_status" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "project_views" CASCADE;--> statement-breakpoint
DROP TABLE "service_status" CASCADE;--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_icon_id_media_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "skills" DROP CONSTRAINT "skills_tech_id_technologies_id_fk";
--> statement-breakpoint
ALTER TABLE "technologies" DROP CONSTRAINT "technologies_icon_id_media_assets_id_fk";
--> statement-breakpoint
DROP INDEX "slug_idx";--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "is_approved" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ALTER COLUMN "order" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "page_content_media" ALTER COLUMN "display_order" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "is_published" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_links" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_sections" ALTER COLUMN "order" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_timeline" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_timeline" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "is_featured" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "view_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "pricing_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "is_available" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ALTER COLUMN "tech_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ALTER COLUMN "subscribed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_technology_id_pk" PRIMARY KEY("project_id","technology_id");--> statement-breakpoint
ALTER TABLE "service_technologies" ADD CONSTRAINT "service_technologies_service_id_technology_id_pk" PRIMARY KEY("service_id","technology_id");--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "hash" varchar(64);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "subject" varchar(255);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" "message_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "replied_at" timestamp;--> statement-breakpoint
ALTER TABLE "page_content" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "excerpt" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reading_time" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD COLUMN "role" varchar(50);--> statement-breakpoint
ALTER TABLE "project_technologies" ADD COLUMN "years_used" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "icon_name" varchar(50);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "status" "subscriber_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "confirm_token" varchar(64);--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "unsubscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "technologies" ADD COLUMN "icon_name" varchar(50);--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "company" varchar(100);--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_ratings" ADD CONSTRAINT "post_ratings_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_og_image_id_media_assets_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "page_view_uniq" ON "page_views" USING btree ("path","day");--> statement-breakpoint
CREATE INDEX "page_view_day_idx" ON "page_views" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "post_rating_uniq" ON "post_ratings" USING btree ("post_id","visitor_id");--> statement-breakpoint
CREATE INDEX "revision_post_idx" ON "post_revisions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "seo_page_idx" ON "seo_metadata" USING btree ("page_type","page_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_tech_id_technologies_id_fk" FOREIGN KEY ("tech_id") REFERENCES "public"."technologies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_email_idx" ON "messages" USING btree ("email");--> statement-breakpoint
CREATE INDEX "post_published_idx" ON "posts" USING btree ("is_published","published_at");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_featured_idx" ON "projects" USING btree ("is_featured");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_read";--> statement-breakpoint
ALTER TABLE "page_content" DROP COLUMN "last_updated";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "icon_id";--> statement-breakpoint
ALTER TABLE "subscribers" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "technologies" DROP COLUMN "icon_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_hash_unique" UNIQUE("hash");--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_tech_id_unique" UNIQUE("tech_id");--> statement-breakpoint
DROP TYPE "public"."health_status";--> statement-breakpoint
DROP TYPE "public"."user_role";