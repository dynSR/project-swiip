import { eq } from 'drizzle-orm';

import { db } from '../database.js';
import { decisionRecords } from '../schema/decision-records.schema.js';

export function createDecisionRecordRepository(database = db) {
    return {
        findById(id: string) {
            return database
            .select()
            .from(decisionRecords)
            .where(eq(decisionRecords.id, id))
            .get();
        },

        findByDiscussionThreadId(threadId: string) {
            return database
            .select()
            .from(decisionRecords)
            .where(eq(decisionRecords.discussionThreadId, threadId))
            .get();
        },

        create(record: typeof decisionRecords.$inferInsert) {
            return database
            .insert(decisionRecords)
            .values(record)
            .returning()
            .get();
        },

        updateArchiveMessageId(id: string, archiveMessageId: string) {
            return database.update(decisionRecords)
            .set({ archiveMessageId })
            .where(eq(decisionRecords.id, id))
            .returning()
            .get() ?? undefined;
        },
    };
}

export const decisionRecordRepository = createDecisionRecordRepository();