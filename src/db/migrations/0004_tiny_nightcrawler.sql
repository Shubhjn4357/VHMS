CREATE TABLE `dashboard_layout_widgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`layout_key` text NOT NULL,
	`widget_key` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_layout_widgets_user_layout_widget_idx` ON `dashboard_layout_widgets` (`user_id`,`layout_key`,`widget_key`);