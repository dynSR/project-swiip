import { sql } from 'drizzle-orm';
import {
    check,
    integer,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core';

export const guildConfigurations = sqliteTable('guild_configurations', {
    guildId: text('guild_id').primaryKey().notNull(),

    forumChannelId: text('forum_channel_id').notNull(),
    archiveChannelId: text('archive_channel_id').notNull(),

    discussionManagementRoleIds: text('discussion_management_role_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),

    archiveManagementRoleIds: text('archive_management_role_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),

    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, (table) => [
    check(
        'guild_configurations_discussion_roles_json_check',
        sql`json_valid(${ table.discussionManagementRoleIds })`,
    ),
    check(
        'guild_configurations_archive_roles_json_check',
        sql`json_valid(${ table.archiveManagementRoleIds })`,
    ),
]);