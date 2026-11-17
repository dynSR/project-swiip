import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import { createDiscussion } from '../../../database/tests/fixtures/discussions.fixture.js';
import { createGuildConfiguration } from '../../../database/tests/fixtures/guild-configurations.fixture.js';
import { createTestDatabase } from '../../../database/tests/helpers/database.helper.js';

import { discussions } from '../../../database/schema/discussions.schema.js';
import { discussionHistories } from '../../../database/schema/discussion-histories.schema.js';

import {
    AppError,
    ERROR_CODES
} from '../../../shared/errors/app.error.js';

import { DISCUSSION_STATUSES } from '../../../shared/constants/discussion.constants.js';
import type { DiscussionStatus } from '../../../shared/types/discussion.type.js';

import { createDiscussionLifecycleService } from '../discussion-lifecycle.service.js';

const ALLOWED_TRANSITIONS = [
    [DISCUSSION_STATUSES.NEW, DISCUSSION_STATUSES.OPEN],
    [DISCUSSION_STATUSES.OPEN, DISCUSSION_STATUSES.DEFERRED],
    [DISCUSSION_STATUSES.OPEN, DISCUSSION_STATUSES.CLOSED],
    [DISCUSSION_STATUSES.DEFERRED, DISCUSSION_STATUSES.OPEN],
    [DISCUSSION_STATUSES.DEFERRED, DISCUSSION_STATUSES.CLOSED],
] as const satisfies readonly (readonly [DiscussionStatus, DiscussionStatus])[];

async function setupDiscussion(status: DiscussionStatus = DISCUSSION_STATUSES.NEW) {
    const { db, cleanup } = await createTestDatabase();

    const configuration = createGuildConfiguration(db);
    const threadId = randomUUID();

    await createDiscussion(db, {
        threadId,
        guildId: configuration.guildId,
        createdBy: 'test-user-id',
        archiveChannelId: 'archive-channel-id',
        status,
    });

    return {
        db,
        cleanup,
        threadId,
        service: createDiscussionLifecycleService(db),
    };
}

for (const [previousStatus, newStatus] of ALLOWED_TRANSITIONS) {
    test(`transitions ${ previousStatus } to ${ newStatus }`, async (t) => {
        const { db, cleanup, threadId, service } =
            await setupDiscussion(previousStatus);

        t.after(cleanup);

        const result = service.transitionDiscussionStatus({
            threadId,
            newStatus,
            performedBy: 'moderator-id',
            reason: 'Test transition',
        });

        assert.equal(result.discussion.status, newStatus);
        assert.equal(result.history.previousStatus, previousStatus);
        assert.equal(result.history.newStatus, newStatus);
        assert.equal(result.history.performedBy, 'moderator-id');
        assert.equal(result.history.reason, 'Test transition');

        const persistedDiscussion = db
        .select()
        .from(discussions)
        .where(eq(discussions.threadId, threadId))
        .get();

        const persistedHistory = db
        .select()
        .from(discussionHistories)
        .where(eq(discussionHistories.discussionThreadId, threadId))
        .all();

        assert.equal(persistedDiscussion?.status, newStatus);
        assert.equal(persistedHistory.length, 1);
        assert.equal(persistedHistory[0]?.previousStatus, previousStatus);
        assert.equal(persistedHistory[0]?.newStatus, newStatus);
    });
}

const FORBIDDEN_TRANSITIONS = [
    [DISCUSSION_STATUSES.NEW, DISCUSSION_STATUSES.DEFERRED],
    [DISCUSSION_STATUSES.NEW, DISCUSSION_STATUSES.CLOSED],
    [DISCUSSION_STATUSES.CLOSED, DISCUSSION_STATUSES.OPEN],
] as const satisfies readonly (readonly [DiscussionStatus, DiscussionStatus])[];

for (const [previousStatus, newStatus] of FORBIDDEN_TRANSITIONS) {
    test(`rejects transition ${ previousStatus } to ${ newStatus }`, async (t) => {
        const { db, cleanup, threadId, service } =
            await setupDiscussion(previousStatus);

        t.after(cleanup);

        assert.throws(
            () => service.transitionDiscussionStatus({
                threadId,
                newStatus,
                performedBy: 'moderator-id',
                reason: 'Test transition',
            }),
            (error: unknown) =>
                error instanceof AppError
                && error.code === ERROR_CODES.INVALID_STATUS_TRANSITION,
        );

        const persistedDiscussion = db
        .select()
        .from(discussions)
        .where(eq(discussions.threadId, threadId))
        .get();

        const persistedHistory = db
        .select()
        .from(discussionHistories)
        .where(eq(discussionHistories.discussionThreadId, threadId))
        .all();

        assert.equal(persistedDiscussion?.status, previousStatus);
        assert.equal(persistedHistory.length, 0);
    });
}

test('rejects transition when discussion does not exist', async (t) => {
    const { cleanup, service } = await setupDiscussion();

    t.after(cleanup);

    assert.throws(
        () => service.transitionDiscussionStatus({
            threadId: randomUUID(),
            newStatus: DISCUSSION_STATUSES.OPEN,
            performedBy: 'moderator-id',
            reason: 'Test transition',
        }),
        (error: unknown) =>
            error instanceof AppError
            && error.code === ERROR_CODES.THREAD_NOT_FOUND,
    );
});

test('rolls back status update when history insertion fails', async (t) => {
    const { db, cleanup, threadId, service } = await setupDiscussion();

    t.after(cleanup);

    assert.throws(
        () => service.transitionDiscussionStatus({
            threadId,
            newStatus: DISCUSSION_STATUSES.OPEN,
            performedBy: 'moderator-id',
            reason: 'x'.repeat(1001),
        }),
        /CHECK constraint failed/,
    );

    const persistedDiscussion = db
    .select()
    .from(discussions)
    .where(eq(discussions.threadId, threadId))
    .get();

    const persistedHistory = db
    .select()
    .from(discussionHistories)
    .where(eq(discussionHistories.discussionThreadId, threadId))
    .all();

    assert.equal(persistedDiscussion?.status, DISCUSSION_STATUSES.NEW);
    assert.equal(persistedHistory.length, 0);
});