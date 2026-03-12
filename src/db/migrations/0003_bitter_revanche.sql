CREATE TABLE `announcement_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`acknowledgement_required` integer DEFAULT false NOT NULL,
	`expires_at` integer,
	`published_at` integer,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `announcement_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`announcement_post_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_value` text,
	FOREIGN KEY (`announcement_post_id`) REFERENCES `announcement_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`communication_log_id` text NOT NULL,
	`template_id` text,
	`channel` text NOT NULL,
	`destination` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_attempt_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`communication_log_id`) REFERENCES `communication_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `communication_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_center_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`href` text,
	`read` integer DEFAULT false NOT NULL,
	`acknowledged_at` integer,
	`source_type` text,
	`source_id` text,
	`target_role` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `communication_templates` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `communication_templates` ADD `updated_at` integer NOT NULL;