import { discussionHistories } from '../../schema/discussion-histories.schema.js';

import type { createTestDatabase } from '../helpers/database.helper.js';

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db'];
type DiscussionHistoryInsert = typeof discussionHistories.$inferInsert;

type DiscussionHistoryFixtureOptions = Pick<
    DiscussionHistoryInsert,
    'discussionThreadId' | 'previousStatus' | 'newStatus' | 'performedBy' | 'reason'
>;

export async function createDiscussionHistory(
    db: TestDatabase,
    options: DiscussionHistoryFixtureOptions,
) {
    const history = {
        discussionThreadId: options.discussionThreadId,
        previousStatus: options.previousStatus,
        newStatus: options.newStatus,
        performedBy: options.performedBy,
        reason: options.reason,
    };

    await db.insert(discussionHistories).values(history);

    return history;
}