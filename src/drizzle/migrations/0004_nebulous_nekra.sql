ALTER TABLE "project_sections" DROP CONSTRAINT "project_sections_media_id_media_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_main_thumbnail_id_media_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_sections" ADD CONSTRAINT "project_sections_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_main_thumbnail_id_media_assets_id_fk" FOREIGN KEY ("main_thumbnail_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;