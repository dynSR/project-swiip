import { randomUUID } from 'node:crypto';

import {
    check,
    integer,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core';
import {
    sql,
    type SQL
} from 'drizzle-orm';

import {
    DECISION_OUTCOMES,
    DISCUSSION_CATEGORIES,
} from '../../shared/constants/discussion.constants.js';

import { guildConfigurations } from './guild-configurations.schema.js';
import { discussions } from './discussions.schema.js';

type DiscussionCategory =
    typeof DISCUSSION_CATEGORIES[keyof typeof DISCUSSION_CATEGORIES];

type DecisionOutcome =
    typeof DECISION_OUTCOMES[keyof typeof DECISION_OUTCOMES];

function toSqlValues(values: readonly string[]): SQL {
    const escapedValues = values.map(value =>
        sql.raw(`'${ value.replaceAll("'", "''") }'`),
    );

    return sql.join(escapedValues, sql`, `);
}

export const decisionRecords = sqliteTable('decision_records', {
    // Identity and relationships
    id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),

    guildId: text('guild_id')
    .notNull()
    .references(() => guildConfigurations.guildId, {
        onDelete: 'cascade',
    }),

    discussionThreadId: text('discussion_thread_id')
    .unique()
    .references(() => discussions.threadId, {
        onDelete: 'set null',
    }),

    // Discord archive references
    archiveChannelId: text('archive_channel_id').notNull(),

    archiveMessageId: text('archive_message_id')
    .unique(),

    // Original discussion snapshot
    title: text('title').notNull(),

    category: text('category')
    .$type<DiscussionCategory>()
    .notNull(),

    initialProposal: text('initial_proposal').notNull(),

    // Decision information
    decision: text('decision')
    .$type<DecisionOutcome>()
    .notNull(),

    finalSummary: text('final_summary').notNull(),

    additionalNotes: text('additional_notes'),

    // Audit information
    createdBy: text('created_by').notNull(),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),

    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, (table) => [
    check(
        'decision_records_title_length_check',
        sql`length(${ table.title }) BETWEEN 1 AND 150`,
    ),

    check(
        'decision_records_category_check',
        sql`${ table.category } IN (${ toSqlValues(Object.values(DISCUSSION_CATEGORIES)) })`,
    ),

    check(
        'decision_records_decision_check',
        sql`${ table.decision } IN (${ toSqlValues(Object.values(DECISION_OUTCOMES)) })`,
    ),

    check(
        'decision_records_final_summary_check',
        sql`length(trim(${ table.finalSummary })) > 0`,
    ),
]);