ALTER TABLE `discussion` RENAME TO `discussions`;--> statement-breakpoint
ALTER TABLE `guild_configuration` RENAME TO `guild_configurations`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_discussions` (
	`thread_id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`forum_channel_id` text NOT NULL,
	`title` text NOT NULL,
	`context` text NOT NULL,
	`proposal` text NOT NULL,
	`category` text NOT NULL,
	`level` text NOT NULL,
	`created_by` text NOT NULL,
	`starter_message_id` text NOT NULL,
	`controls_message_id` text NOT NULL,
	`history_summary_message_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guild_configurations`(`guild_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "discussions_title_length_check" CHECK(length
        (
        "__new_discussions"."title"
        )
        BETWEEN
        1
        AND
        150),
	CONSTRAINT "discussions_category_check" CHECK("__new_discussions"."category"
        IN (
        'GAMEPLAY', 'ART & DESIGN', 'TECHNICAL', 'GAME DESIGN', 'AUDIO', 'WORKFLOW'
        )),
	CONSTRAINT "discussions_level_check" CHECK("__new_discussions"."level"
        IN (
        'QUICK', 'STRUCTURED', 'DECISION'
        )),
	CONSTRAINT "discussions_status_check" CHECK("__new_discussions"."status"
        IN (
        'NEW', 'OPEN', 'DEFERRED', 'CLOSED'
        ))
);
--> statement-breakpoint
INSERT INTO `__new_discussions`("thread_id", "guild_id", "forum_channel_id", "title", "context", "proposal", "category", "level", "created_by", "starter_message_id", "controls_message_id", "history_summary_message_id", "status", "created_at", "updated_at") SELECT "thread_id", "guild_id", "forum_channel_id", "title", "context", "proposal", "category", "level", "created_by", "starter_message_id", "controls_message_id", "history_summary_message_id", "status", "created_at", "updated_at" FROM `discussions`;--> statement-breakpoint
DROP TABLE `discussions`;--> statement-breakpoint
ALTER TABLE `__new_discussions` RENAME TO `discussions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;