import { asc, eq } from 'drizzle-orm';

import { db } from '../database.js';
import { discussionHistories } from '../schema/discussion-histories.schema.js';

export function createDiscussionHistoryRepository(database = db) {
    return {
        findByDiscussionThreadId(threadId: string) {
            return database
            .select()
            .from(discussionHistories)
            .where(eq(discussionHistories.discussionThreadId, threadId))
            .orderBy(asc(discussionHistories.createdAt))
            .all();
        },

        create(history: typeof discussionHistories.$inferInsert) {
            return database
            .insert(discussionHistories)
            .values(history)
            .returning()
            .get();
        },
    };
}

export const discussionHistoryRepository = createDiscussionHistoryRepository();