CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uploads_storage_key_idx" ON "uploads" USING btree ("storage_key");