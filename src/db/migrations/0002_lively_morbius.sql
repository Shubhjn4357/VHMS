CREATE TABLE `consent_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`admission_id` text,
	`procedure_name` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`rendered_body` text NOT NULL,
	`requires_witness` integer DEFAULT false NOT NULL,
	`requires_doctor` integer DEFAULT false NOT NULL,
	`finalized_at` integer,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admission_id`) REFERENCES `admissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consent_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`consent_document_id` text NOT NULL,
	`signer_role` text NOT NULL,
	`signer_name` text NOT NULL,
	`mode` text NOT NULL,
	`notes` text,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`consent_document_id`) REFERENCES `consent_documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consent_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`requires_witness` integer DEFAULT false NOT NULL,
	`requires_doctor` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_templates_slug_unique` ON `consent_templates` (`slug`);--> statement-breakpoint
CREATE TABLE `discharge_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`admission_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`diagnosis` text NOT NULL,
	`hospital_course` text NOT NULL,
	`procedures` text,
	`discharge_medication` text,
	`discharge_advice` text NOT NULL,
	`follow_up_instructions` text NOT NULL,
	`version_count` integer DEFAULT 1 NOT NULL,
	`prepared_by_user_id` text,
	`finalized_by_user_id` text,
	`finalized_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`admission_id`) REFERENCES `admissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discharge_summaries_admission_id_unique` ON `discharge_summaries` (`admission_id`);--> statement-breakpoint
CREATE TABLE `discharge_summary_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`discharge_summary_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`discharge_summary_id`) REFERENCES `discharge_summaries`(`id`) ON UPDATE no action ON DELETE no action
);
