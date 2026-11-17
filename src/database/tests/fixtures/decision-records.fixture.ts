import { decisionRecords } from '../../schema/decision-records.schema.js';

import type { createTestDatabase } from '../helpers/database.helper.js';

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db'];
type DecisionRecordInsert = typeof decisionRecords.$inferInsert;

type DecisionRecordFixtureOptions = Pick<
    DecisionRecordInsert,
    | 'guildId'
    | 'archiveChannelId'
    | 'archiveMessageId'
    | 'title'
    | 'category'
    | 'initialProposal'
    | 'decision'
    | 'finalSummary'
    | 'createdBy'
> & Partial<Pick<DecisionRecordInsert, 'discussionThreadId' | 'additionalNotes'>>;

export async function createDecisionRecord(
    db: TestDatabase,
    options: DecisionRecordFixtureOptions,
) {
    const record = {
        guildId: options.guildId,
        discussionThreadId: options.discussionThreadId ?? null,
        archiveChannelId: options.archiveChannelId,
        archiveMessageId: options.archiveMessageId,
        title: options.title,
        category: options.category,
        initialProposal: options.initialProposal,
        decision: options.decision,
        finalSummary: options.finalSummary,
        additionalNotes: options.additionalNotes ?? null,
        createdBy: options.createdBy,
    };

    await db.insert(decisionRecords).values(record);

    return record;
}