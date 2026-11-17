import { decisionRecordVersions } from '../../schema/decision-record-versions.schema.js';

import type { createTestDatabase } from '../helpers/database.helper.js';

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db'];
type DecisionRecordVersionInsert = typeof decisionRecordVersions.$inferInsert;

type DecisionRecordVersionFixtureOptions = Pick<
    DecisionRecordVersionInsert,
    | 'decisionRecordId'
    | 'version'
    | 'title'
    | 'category'
    | 'initialProposal'
    | 'decision'
    | 'finalSummary'
    | 'modifiedBy'
    | 'reason'
> & Partial<Pick<DecisionRecordVersionInsert, 'additionalNotes'>>;

export async function createDecisionRecordVersion(
    db: TestDatabase,
    options: DecisionRecordVersionFixtureOptions,
) {
    const version = {
        decisionRecordId: options.decisionRecordId,
        version: options.version,
        title: options.title,
        category: options.category,
        initialProposal: options.initialProposal,
        decision: options.decision,
        finalSummary: options.finalSummary,
        additionalNotes: options.additionalNotes ?? null,
        modifiedBy: options.modifiedBy,
        reason: options.reason,
    };

    await db.insert(decisionRecordVersions).values(version);

    return version;
}