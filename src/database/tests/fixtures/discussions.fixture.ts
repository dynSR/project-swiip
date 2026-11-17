import { discussions } from '../../schema/discussions.schema.js';

import type { createTestDatabase } from '../helpers/database.helper.js';

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db'];
type DiscussionInsert = typeof discussions.$inferInsert;

type DiscussionFixtureOptions =
    Pick<
        DiscussionInsert,
        'threadId' | 'guildId' | 'createdBy' | 'archiveChannelId'
    >
    & Partial<Omit<
    DiscussionInsert,
    | 'threadId'
    | 'guildId'
    | 'createdBy'
    | 'archiveChannelId'
    | 'createdAt'
    | 'updatedAt'
>>;

export async function createDiscussion(
    db: TestDatabase,
    options: DiscussionFixtureOptions,
) {
    const discussion = {
        threadId: options.threadId,
        guildId: options.guildId,
        forumChannelId: options.forumChannelId ?? 'forum-channel-id',
        archiveChannelId: options.archiveChannelId,
        title: options.title ?? 'Test discussion',
        context: options.context ?? 'Test context',
        proposal: options.proposal ?? 'Test proposal',
        category: options.category ?? 'GAMEPLAY',
        level: options.level ?? 'QUICK',
        status: options.status ?? 'NEW',
        createdBy: options.createdBy,
        starterMessageId: options.starterMessageId ?? 'starter-message-id',
        controlsMessageId: options.controlsMessageId ?? 'controls-message-id',
        historySummaryMessageId:
            options.historySummaryMessageId ?? 'history-summary-message-id',
    };

    await db.insert(discussions).values(discussion);

    return discussion;
}