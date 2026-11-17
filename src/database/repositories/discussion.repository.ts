import { eq } from 'drizzle-orm';
import { DiscussionStatus } from "../../shared/types/discussion.type.js";

import { db } from '../database.js';
import { discussions } from '../schema/discussions.schema.js';

export function createDiscussionRepository(database = db) {
    return {
        findByThreadId(threadId: string) {
            return database
            .select()
            .from(discussions)
            .where(eq(discussions.threadId, threadId))
            .get();
        },

        create(discussion: typeof discussions.$inferInsert) {
            return database
            .insert(discussions)
            .values(discussion)
            .returning()
            .get();
        },

        updateStatus(threadId: string, status: DiscussionStatus) {
            return database
            .update(discussions)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(discussions.threadId, threadId))
            .returning()
            .get();
        },

        updateHistorySummaryMessageId(threadId: string, messageId: string) {
            return database
            .update(discussions)
            .set({
                historySummaryMessageId: messageId,
                updatedAt: new Date(),
            })
            .where(eq(discussions.threadId, threadId))
            .returning()
            .get();
        },

        deleteByThreadId(threadId: string) {
            return database
            .delete(discussions)
            .where(eq(discussions.threadId, threadId))
            .returning()
            .get();
        },
    };
}

export const discussionRepository = createDiscussionRepository();