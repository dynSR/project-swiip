PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_guild_configurations` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`forum_channel_id` text NOT NULL,
	`archive_channel_id` text NOT NULL,
	`discussion_management_role_ids` text DEFAULT '[]' NOT NULL,
	`archive_management_role_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "guild_configurations_discussion_roles_json_check" CHECK(json_valid("__new_guild_configurations"."discussion_management_role_ids")),
	CONSTRAINT "guild_configurations_archive_roles_json_check" CHECK(json_valid("__new_guild_configurations"."archive_management_role_ids"))
);
--> statement-breakpoint
INSERT INTO `__new_guild_configurations`("guild_id", "forum_channel_id", "archive_channel_id", "discussion_management_role_ids", "archive_management_role_ids", "created_at", "updated_at") SELECT "guild_id", "forum_channel_id", "archive_channel_id", "discussion_management_role_ids", "archive_management_role_ids", "created_at", "updated_at" FROM `guild_configurations`;--> statement-breakpoint
DROP TABLE `guild_configurations`;--> statement-breakpoint
ALTER TABLE `__new_guild_configurations` RENAME TO `guild_configurations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;