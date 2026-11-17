import { randomUUID } from 'node:crypto';

import {
    check,
    integer,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

import { DISCUSSION_STATUSES } from '../../shared/constants/discussion.constants.js';

import { discussions } from './discussions.schema.js';

type DiscussionStatus =
    typeof DISCUSSION_STATUSES[keyof typeof DISCUSSION_STATUSES];

function toSqlValues(values: readonly string[]): string {
    return values
    .map(value => `'${ value.replaceAll("'", "''") }'`)
    .join(', ');
}

export const discussionHistories = sqliteTable('discussion_histories', {
    // Identity and relationship
    id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),

    discussionThreadId: text('discussion_thread_id')
    .notNull()
    .references(() => discussions.threadId, {
        onDelete: 'cascade',
    }),

    // Status transition
    previousStatus: text('previous_status')
    .$type<DiscussionStatus>()
    .notNull(),

    newStatus: text('new_status')
    .$type<DiscussionStatus>()
    .notNull(),

    performedBy: text('performed_by').notNull(),

    reason: text('reason').notNull(),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
    check(
        'discussion_histories_previous_status_check',
        sql`${ table.previousStatus } IN (${ sql.raw(toSqlValues(Object.values(DISCUSSION_STATUSES))) })`,
    ),

    check(
        'discussion_histories_new_status_check',
        sql`${ table.newStatus } IN (${ sql.raw(toSqlValues(Object.values(DISCUSSION_STATUSES))) })`,
    ),

    check(
        'discussion_histories_transition_check',
        sql`(
        (${ table.previousStatus } = '${ sql.raw(DISCUSSION_STATUSES.NEW) }' AND ${ table.newStatus } = '${ sql.raw(
            DISCUSSION_STATUSES.OPEN) }')
        OR
        (${ table.previousStatus } = '${ sql.raw(DISCUSSION_STATUSES.OPEN) }' AND ${ table.newStatus } IN (
            '${ sql.raw(DISCUSSION_STATUSES.DEFERRED) }',
            '${ sql.raw(DISCUSSION_STATUSES.CLOSED) }'
        ))
        OR
        (${ table.previousStatus } = '${ sql.raw(DISCUSSION_STATUSES.DEFERRED) }' AND ${ table.newStatus } IN (
            '${ sql.raw(DISCUSSION_STATUSES.OPEN) }',
            '${ sql.raw(DISCUSSION_STATUSES.CLOSED) }'
        ))
    )`,
    ),

    check(
        'discussion_histories_reason_length_check',
        sql`length(trim(${ table.reason })) BETWEEN 1 AND 1000`,
    ),
]);