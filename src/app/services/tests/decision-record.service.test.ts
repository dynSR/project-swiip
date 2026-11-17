import assert from 'node:assert/strict';
import { randomUUID } from "node:crypto";
import test from 'node:test';

import { DISCUSSION_STATUSES } from '../../../shared/constants/discussion.constants.js';

import { createDecisionRecordRepository } from '../../../database/repositories/decision-record.repository.js';
import { createDiscussionRepository } from '../../../database/repositories/discussion.repository.js';

import { createDiscussion } from '../../../database/tests/fixtures/discussions.fixture.js';
import { createGuildConfiguration } from '../../../database/tests/fixtures/guild-configurations.fixture.js';
import { createTestDatabase } from '../../../database/tests/helpers/database.helper.js';

import { createDecisionRecordService } from '../decision-record.service.js';

test('Decision record service should prepare decision records correctly', async (t) => {
    const { db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    const decisionRecordRepository = createDecisionRecordRepository(db);
    const discussionRepository = createDiscussionRepository(db);

    const decisionRecordService = createDecisionRecordService(
        decisionRecordRepository,
        discussionRepository,
    );

    await t.test('should prepare a decision record using the discussion archive channel', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = 'test-thread-id';
        const originalArchiveChannelId = 'original-archive-channel-id';

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: originalArchiveChannelId,
            status: DISCUSSION_STATUSES.OPEN,
        });

        const record = decisionRecordService.prepareDecisionRecord({
            threadId,
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            performedBy: 'test-user-id',
        });

        assert.equal(record.discussionThreadId, threadId);
        assert.equal(record.archiveChannelId, originalArchiveChannelId);
        assert.equal(record.archiveMessageId, null);
        assert.equal(record.decision, 'APPROVED');
        assert.equal(record.finalSummary, 'The proposal was approved.');
        assert.equal(record.createdBy, 'test-user-id');
    });

    await t.test('should return the existing record when the same decision is prepared twice', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'original-archive-channel-id',
            status: DISCUSSION_STATUSES.OPEN,
        });

        const input = {
            threadId,
            decision: 'APPROVED' as const,
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            performedBy: 'test-user-id',
        };

        const firstRecord = decisionRecordService.prepareDecisionRecord(input);
        const secondRecord = decisionRecordService.prepareDecisionRecord(input);

        assert.equal(secondRecord.id, firstRecord.id);
        assert.equal(secondRecord.discussionThreadId, threadId);
    });

    await t.test('should reject different closing information for an existing record', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'original-archive-channel-id',
            status: DISCUSSION_STATUSES.OPEN,
        });

        const input = {
            threadId,
            decision: 'APPROVED' as const,
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            performedBy: 'test-user-id',
        };

        const originalRecord = decisionRecordService.prepareDecisionRecord(input);

        assert.throws(() => {
            decisionRecordService.prepareDecisionRecord({
                ...input,
                decision: 'REJECTED',
            });
        }, Error);

        const existingRecord = decisionRecordRepository.findByDiscussionThreadId(threadId);

        assert.equal(existingRecord?.id, originalRecord.id);
        assert.equal(existingRecord?.decision, 'APPROVED');
        assert.equal(existingRecord?.finalSummary, 'The proposal was approved.');
    });

    await t.test('should reject a decision record when the discussion does not exist', () => {
        const threadId = randomUUID();

        assert.throws(
            () => decisionRecordService.prepareDecisionRecord({
                threadId,
                decision: 'APPROVED',
                finalSummary: 'The proposal was approved.',
                additionalNotes: null,
                performedBy: 'test-user-id',
            }),
            {
                message: `Discussion "${ threadId }" was not found.`,
            },
        );

        assert.equal(
            decisionRecordRepository.findByDiscussionThreadId(threadId),
            undefined,
        );
    });

    await t.test('should reject decision records for discussions with invalid statuses', async () => {
        const configuration = createGuildConfiguration(db);

        const invalidStatuses = [
            DISCUSSION_STATUSES.NEW,
            DISCUSSION_STATUSES.CLOSED,
        ];

        for (const status of invalidStatuses) {
            const threadId = randomUUID();

            await createDiscussion(db, {
                threadId,
                guildId: configuration.guildId,
                createdBy: 'test-user-id',
                archiveChannelId: 'original-archive-channel-id',
                status,
            });

            assert.throws(
                () => decisionRecordService.prepareDecisionRecord({
                    threadId,
                    decision: 'APPROVED',
                    finalSummary: 'The proposal was approved.',
                    additionalNotes: null,
                    performedBy: 'test-user-id',
                }),
                Error,
            );

            assert.equal(
                decisionRecordRepository.findByDiscussionThreadId(threadId),
                undefined,
            );
        }
    });

    await t.test('should normalize the final summary and additional notes', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'original-archive-channel-id',
            status: DISCUSSION_STATUSES.OPEN,
        });

        const record = decisionRecordService.prepareDecisionRecord({
            threadId,
            decision: 'APPROVED',
            finalSummary: '  The proposal was approved.  ',
            additionalNotes: '   ',
            performedBy: 'test-user-id',
        });

        assert.equal(record.finalSummary, 'The proposal was approved.');
        assert.equal(record.additionalNotes, null);
    });

    await t.test('should reject an empty final summary', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'original-archive-channel-id',
            status: DISCUSSION_STATUSES.OPEN,
        });

        assert.throws(
            () => decisionRecordService.prepareDecisionRecord({
                threadId,
                decision: 'APPROVED',
                finalSummary: '   ',
                additionalNotes: null,
                performedBy: 'test-user-id',
            }),
            {
                message: 'Final summary cannot be empty.',
            },
        );

        assert.equal(
            decisionRecordRepository.findByDiscussionThreadId(threadId),
            undefined,
        );
    });

    await t.test('should preserve additional notes after trimming whitespace', async () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'original-archive-channel-id',
            status: DISCUSSION_STATUSES.OPEN,
        });

        const record = decisionRecordService.prepareDecisionRecord({
            threadId,
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: '  Implementation planned for next sprint.  ',
            performedBy: 'test-user-id',
        });

        assert.equal(
            record.additionalNotes,
            'Implementation planned for next sprint.',
        );
    });
});