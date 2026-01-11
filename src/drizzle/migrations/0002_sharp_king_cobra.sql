CREATE TABLE "page_content_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "page_content" DROP CONSTRAINT "page_content_media_id_media_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "page_content_media" ADD CONSTRAINT "page_content_media_content_id_page_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."page_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_content_media" ADD CONSTRAINT "page_content_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_content" DROP COLUMN "media_id";