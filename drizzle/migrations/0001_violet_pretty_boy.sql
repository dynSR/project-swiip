CREATE TABLE `discussion` (
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
	FOREIGN KEY (`guild_id`) REFERENCES `guild_configuration`(`guild_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "discussions_title_length_check" CHECK(length
        (
        "discussion"."title"
        )
        BETWEEN
        1
        AND
        150),
	CONSTRAINT "discussions_category_check" CHECK("discussion"."category"
        IN (
        'GAMEPLAY', 'ART & DESIGN', 'TECHNICAL', 'GAME DESIGN', 'AUDIO', 'WORKFLOW'
        )),
	CONSTRAINT "discussions_level_check" CHECK("discussion"."level"
        IN (
        'QUICK', 'STRUCTURED', 'DECISION'
        )),
	CONSTRAINT "discussions_status_check" CHECK("discussion"."status"
        IN (
        'NEW', 'OPEN', 'DEFERRED', 'CLOSED'
        ))
);
