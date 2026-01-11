CREATE TABLE "page_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" varchar(50) NOT NULL,
	"section" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"title" varchar(255),
	"value" text,
	"media_id" uuid,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "page_content_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;