ALTER TABLE `doctors` ADD `designation` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `signature_url` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `visit_type` text DEFAULT 'SCHEDULED' NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `queue_number` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `checked_in_at` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `alternate_phone` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `city` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `state` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `emergency_contact` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `blood_group` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `updated_at` integer NOT NULL;