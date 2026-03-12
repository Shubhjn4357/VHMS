CREATE TABLE `print_template_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`template_key` text NOT NULL,
	`section_key` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`updated_by_user_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `print_template_sections_template_section_idx` ON `print_template_sections` (`template_key`,`section_key`);