import { randomUUID } from 'node:crypto';

import {
    check,
    integer,
    sqliteTable,
    text,
    unique,
} from 'drizzle-orm/sqlite-core';

import {
    sql,
    type SQL
} from 'drizzle-orm';

import {
    DECISION_OUTCOMES,
    DISCUSSION_CATEGORIES,
} from '../../shared/constants/discussion.constants.js';

import { decisionRecords } from './decision-records.schema.js';

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

export const decisionRecordVersions = sqliteTable(
    'decision_record_versions',
    {
        // Identity and relationship
        id: text('id')
        .primaryKey()
        .$defaultFn(() => randomUUID()),

        decisionRecordId: text('decision_record_id')
        .notNull()
        .references(() => decisionRecords.id, {
            onDelete: 'cascade',
        }),

        version: integer('version').notNull(),

        // Snapshot
        title: text('title').notNull(),

        category: text('category')
        .$type<DiscussionCategory>()
        .notNull(),

        initialProposal: text('initial_proposal').notNull(),

        decision: text('decision')
        .$type<DecisionOutcome>()
        .notNull(),

        finalSummary: text('final_summary').notNull(),

        additionalNotes: text('additional_notes'),

        // Audit information
        modifiedBy: text('modified_by').notNull(),

        reason: text('reason').notNull(),

        createdAt: integer('created_at', { mode: 'timestamp_ms' })
        .notNull()
        .$defaultFn(() => new Date()),
    },
    (table) => [
        unique('decision_record_versions_record_version_unique')
        .on(table.decisionRecordId, table.version),

        check(
            'decision_record_versions_version_check',
            sql`${ table.version } > 0`,
        ),

        check(
            'decision_record_versions_title_length_check',
            sql`length(${ table.title }) BETWEEN 1 AND 150`,
        ),

        check(
            'decision_record_versions_category_check',
            sql`${ table.category } IN (${ toSqlValues(Object.values(DISCUSSION_CATEGORIES)) })`,
        ),

        check(
            'decision_record_versions_decision_check',
            sql`${ table.decision } IN (${ toSqlValues(Object.values(DECISION_OUTCOMES)) })`,
        ),

        check(
            'decision_record_versions_final_summary_check',
            sql`length(trim(${ table.finalSummary })) > 0`,
        ),

        check(
            'decision_record_versions_reason_length_check',
            sql`length(trim(${ table.reason })) BETWEEN 1 AND 1000`,
        ),
    ],
);