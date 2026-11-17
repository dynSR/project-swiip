CREATE TABLE `decision_records` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`discussion_thread_id` text,
	`archive_channel_id` text NOT NULL,
	`archive_message_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`initial_proposal` text NOT NULL,
	`decision` text NOT NULL,
	`final_summary` text NOT NULL,
	`additional_notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guild_configurations`(`guild_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discussion_thread_id`) REFERENCES `discussions`(`thread_id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "decision_records_title_length_check" CHECK(length("decision_records"."title") BETWEEN 1 AND 150),
	CONSTRAINT "decision_records_category_check" CHECK("decision_records"."category" IN ('GAMEPLAY', 'ART & DESIGN', 'TECHNICAL', 'GAME DESIGN', 'AUDIO', 'WORKFLOW')),
	CONSTRAINT "decision_records_decision_check" CHECK("decision_records"."decision" IN ('APPROVED', 'REJECTED', 'CONSIDERED')),
	CONSTRAINT "decision_records_final_summary_check" CHECK(length(trim("decision_records"."final_summary")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_records_discussion_thread_id_unique` ON `decision_records` (`discussion_thread_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `decision_records_archive_message_id_unique` ON `decision_records` (`archive_message_id`);