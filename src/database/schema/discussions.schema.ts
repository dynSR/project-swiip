import {
    check,
    integer,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

import {
    DISCUSSION_CATEGORIES,
    DISCUSSION_LEVELS,
    DISCUSSION_STATUSES,
} from '../../shared/constants/discussion.constants.js';

import { guildConfigurations } from './guild-configurations.schema.js';

type DiscussionCategory = typeof DISCUSSION_CATEGORIES[keyof typeof DISCUSSION_CATEGORIES];
type DiscussionLevel = typeof DISCUSSION_LEVELS[keyof typeof DISCUSSION_LEVELS];
type DiscussionStatus = typeof DISCUSSION_STATUSES[keyof typeof DISCUSSION_STATUSES];

/**
 * Builds a SQL list of escaped string literals for CHECK constraints.
 * Values come exclusively from our application constants.
 */
function toSqlValues(values: readonly string[]) {
    return sql.raw(
        values.map(value => `'${ value.replaceAll("'", "''") }'`).join(', '),
    );
}

export const discussions = sqliteTable('discussions', {
    // Identity and relationships
    threadId: text('thread_id').primaryKey().notNull(),

    guildId: text('guild_id')
    .notNull()
    .references(() => guildConfigurations.guildId, {
        onDelete: 'cascade',
    }),

    forumChannelId: text('forum_channel_id').notNull(),
    archiveChannelId: text('archive_channel_id').notNull(),
    
    // Discussion information
    title: text('title').notNull(),

    context: text('context').notNull(),

    proposal: text('proposal').notNull(),

    category: text('category')
    .$type<DiscussionCategory>()
    .notNull(),

    level: text('level')
    .$type<DiscussionLevel>()
    .notNull(),

    createdBy: text('created_by').notNull(),

    // Discord message references
    starterMessageId: text('starter_message_id').notNull(),
    controlsMessageId: text('controls_message_id').notNull(),
    historySummaryMessageId: text('history_summary_message_id').notNull(),

    // Lifecycle
    status: text('status')
    .$type<DiscussionStatus>()
    .notNull(),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),

    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, (table) => [
    check(
        'discussions_title_length_check',
        sql`length
        (
        ${ table.title }
        )
        BETWEEN
        1
        AND
        150`,
    ),

    check(
        'discussions_category_check',
        sql`${ table.category }
        IN (
        ${ toSqlValues(Object.values(DISCUSSION_CATEGORIES)) }
        )`,
    ),

    check(
        'discussions_level_check',
        sql`${ table.level }
        IN (
        ${ toSqlValues(Object.values(DISCUSSION_LEVELS)) }
        )`,
    ),

    check(
        'discussions_status_check',
        sql`${ table.status }
        IN (
        ${ toSqlValues(Object.values(DISCUSSION_STATUSES)) }
        )`,
    ),
]);