ALTER TABLE "feature_flags" ADD COLUMN "rollout_percentage" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN "target_roles" text DEFAULT '[]' NOT NULL;