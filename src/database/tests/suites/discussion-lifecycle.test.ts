import assert from 'node:assert/strict';
import test from 'node:test';

import { randomUUID } from 'node:crypto';

import { createGuildConfiguration } from '../fixtures/guild-configurations.fixture.js';
import { createTestDatabase } from '../helpers/database.helper.js';
import { discussions } from '../../schema/discussions.schema.js';
import { discussionHistories } from '../../schema/discussion-histories.schema.js';

test('Discussion lifecycle', async (t) => {
    const { db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    const configuration = createGuildConfiguration(db);

    const threadId = randomUUID();

    db.insert(discussions)
    .values({
        threadId,
        guildId: configuration.guildId,
        forumChannelId: 'forum-id',
        archiveChannelId: 'archive-channel-id',
        title: 'Lifecycle test',
        context: 'Test context',
        proposal: 'Test proposal',
        category: 'GAMEPLAY',
        level: 'QUICK',
        status: 'NEW',
        createdBy: 'user-id',
        starterMessageId: 'starter-id',
        controlsMessageId: 'controls-id',
        historySummaryMessageId: 'summary-id',
    })
    .run();

    const insertTransition = (
        previousStatus: string,
        newStatus: string,
    ) => {
        db.insert(discussionHistories)
        .values({
            discussionThreadId: threadId,
            previousStatus: previousStatus as 'NEW',
            newStatus: newStatus as 'OPEN',
            performedBy: 'user-id',
            reason: 'Lifecycle test transition',
        })
        .run();
    };

    const allowedTransitions = [
        ['NEW', 'OPEN'],
        ['OPEN', 'DEFERRED'],
        ['OPEN', 'CLOSED'],
        ['DEFERRED', 'OPEN'],
        ['DEFERRED', 'CLOSED'],
    ] as const;

    for (const [previousStatus, newStatus] of allowedTransitions) {
        await t.test(
            `${ previousStatus } → ${ newStatus } is allowed`,
            () => {
                insertTransition(previousStatus, newStatus);
            },
        );
    }

    const forbiddenTransitions = [
        ['NEW', 'DEFERRED'],
        ['NEW', 'CLOSED'],
        ['DEFERRED', 'NEW'],
        ['CLOSED', 'NEW'],
        ['CLOSED', 'OPEN'],
        ['CLOSED', 'DEFERRED'],
    ] as const;

    for (const [previousStatus, newStatus] of forbiddenTransitions) {
        await t.test(
            `${ previousStatus } → ${ newStatus } is rejected`,
            () => {
                assert.throws(
                    () => insertTransition(previousStatus, newStatus),
                    /CHECK constraint failed/,
                );
            },
        );
    }
});