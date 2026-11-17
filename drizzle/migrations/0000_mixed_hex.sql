CREATE TABLE `guild_configuration` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`forum_channel_id` text NOT NULL,
	`archive_channel_id` text NOT NULL,
	`discussion_management_role_ids` text DEFAULT '[]' NOT NULL,
	`archive_management_role_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
