CREATE TABLE `decision_record_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_record_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`initial_proposal` text NOT NULL,
	`decision` text NOT NULL,
	`final_summary` text NOT NULL,
	`additional_notes` text,
	`modified_by` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`decision_record_id`) REFERENCES `decision_records`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "decision_record_versions_version_check" CHECK("decision_record_versions"."version" > 0),
	CONSTRAINT "decision_record_versions_title_length_check" CHECK(length("decision_record_versions"."title") BETWEEN 1 AND 150),
	CONSTRAINT "decision_record_versions_category_check" CHECK("decision_record_versions"."category" IN ('GAMEPLAY', 'ART & DESIGN', 'TECHNICAL', 'GAME DESIGN', 'AUDIO', 'WORKFLOW')),
	CONSTRAINT "decision_record_versions_decision_check" CHECK("decision_record_versions"."decision" IN ('APPROVED', 'REJECTED', 'CONSIDERED')),
	CONSTRAINT "decision_record_versions_final_summary_check" CHECK(length(trim("decision_record_versions"."final_summary")) > 0),
	CONSTRAINT "decision_record_versions_reason_length_check" CHECK(length(trim("decision_record_versions"."reason")) BETWEEN 1 AND 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_record_versions_record_version_unique` ON `decision_record_versions` (`decision_record_id`,`version`);