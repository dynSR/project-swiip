import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type { Guild } from 'discord.js';

import { createDecisionRecordRepository } from '../../../database/repositories/decision-record.repository.js';
import { createDiscussionRepository } from '../../../database/repositories/discussion.repository.js';

import { createDecisionRecord } from '../../../database/tests/fixtures/decision-records.fixture.js';
import { createDiscussion } from '../../../database/tests/fixtures/discussions.fixture.js';
import { createGuildConfiguration } from '../../../database/tests/fixtures/guild-configurations.fixture.js';
import { createTestDatabase } from '../../../database/tests/helpers/database.helper.js';

import { createDiscussionCleanupService } from '../discussion-cleanup.service.js';

import { eq } from 'drizzle-orm';

import { decisionRecords } from '../../../database/schema/decision-records.schema.js';

test('Discussion cleanup service should clean up archived discussions correctly', async (t) => {
    const { db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    const decisionRecordRepository = createDecisionRecordRepository(db);
    const discussionRepository = createDiscussionRepository(db);

    const cleanupService = createDiscussionCleanupService(
        decisionRecordRepository,
        discussionRepository,
    );

    async function createArchivedDiscussion(
        archiveMessageId: string | null = randomUUID(),
    ) {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'archive-channel-id',
            status: 'OPEN',
        });

        await createDecisionRecord(db, {
            guildId: configuration.guildId,
            discussionThreadId: threadId,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId,
            title: 'Test discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            createdBy: 'test-user-id',
        });

        return {
            guildId: configuration.guildId,
            threadId,
        };
    }

    function createGuild(
        guildId: string,
        fetch: () => Promise<unknown>,
    ) {
        return {
            id: guildId,
            channels: { fetch },
        } as unknown as Guild;
    }

    await t.test('should reject when the discussion does not exist', async () => {
        const guild = createGuild('guild-id', async () => null);

        await assert.rejects(
            () => cleanupService.cleanupArchivedDiscussion(
                guild,
                randomUUID(),
            ),
            {
                message: /was not found/,
            },
        );
    });

    await t.test('should reject discussions belonging to another guild', async () => {
        const archiveMessageId = randomUUID();
        const { guildId, threadId } = await createArchivedDiscussion(archiveMessageId);

        const guild = createGuild(
            'another-guild-id',
            async () => null,
        );

        await assert.rejects(
            () => cleanupService.cleanupArchivedDiscussion(guild, threadId),
            {
                message: 'The discussion belongs to another server.',
            },
        );

        assert.ok(discussionRepository.findByThreadId(threadId));
    });

    await t.test('should reject discussions without a published archive', async () => {
        const { guildId, threadId } = await createArchivedDiscussion(null);

        const guild = createGuild(guildId, async () => null);

        await assert.rejects(
            () => cleanupService.cleanupArchivedDiscussion(guild, threadId),
            {
                message: 'Cannot delete a discussion without a successfully published archive.',
            },
        );

        assert.ok(discussionRepository.findByThreadId(threadId));
    });

    await t.test('should preserve the discussion when Discord thread retrieval fails', async () => {
        const archiveMessageId = randomUUID();
        const { guildId, threadId } = await createArchivedDiscussion(archiveMessageId);

        const guild = createGuild(guildId, async () => {
            throw new Error('Discord API unavailable.');
        });

        await assert.rejects(
            () => cleanupService.cleanupArchivedDiscussion(guild, threadId),
            {
                message: 'Discord API unavailable.',
            },
        );

        assert.ok(discussionRepository.findByThreadId(threadId));
    });

    await t.test('should preserve the discussion when Discord thread deletion fails', async () => {
        const archiveMessageId = randomUUID();
        const { guildId, threadId } = await createArchivedDiscussion(archiveMessageId);

        const guild = createGuild(guildId, async () => ({
            isThread: () => true,
            delete: async () => {
                throw new Error('Missing permissions.');
            },
        }));

        await assert.rejects(
            () => cleanupService.cleanupArchivedDiscussion(guild, threadId),
            {
                message: 'Missing permissions.',
            },
        );

        assert.ok(discussionRepository.findByThreadId(threadId));
    });

    await t.test('should delete the database discussion when the Discord thread no longer exists', async () => {
        const archiveMessageId = randomUUID();
        const { guildId, threadId } = await createArchivedDiscussion(archiveMessageId);

        const guild = createGuild(guildId, async () => null);

        await cleanupService.cleanupArchivedDiscussion(guild, threadId);

        assert.equal(
            discussionRepository.findByThreadId(threadId),
            undefined,
        );

        const record = decisionRecordRepository.findByDiscussionThreadId(threadId);

        assert.equal(record, undefined);

        const preservedRecord = db
        .select()
        .from(decisionRecords)
        .where(eq(decisionRecords.archiveMessageId, archiveMessageId))
        .get();

        assert.ok(preservedRecord);
        assert.equal(preservedRecord.discussionThreadId, null);
        assert.equal(preservedRecord.archiveMessageId, archiveMessageId);
    });

    await t.test('should delete the Discord thread and database discussion', async () => {
        const archiveMessageId = randomUUID();
        const { guildId, threadId } = await createArchivedDiscussion(archiveMessageId);

        let threadDeleted = false;

        const guild = createGuild(guildId, async () => ({
            isThread: () => true,
            delete: async () => {
                threadDeleted = true;
            },
        }));

        await cleanupService.cleanupArchivedDiscussion(guild, threadId);

        assert.equal(threadDeleted, true);

        assert.equal(
            discussionRepository.findByThreadId(threadId),
            undefined,
        );

        const record = db
        .select()
        .from(decisionRecords)
        .where(eq(decisionRecords.archiveMessageId, archiveMessageId))
        .get();

        assert.ok(record);
        assert.equal(record.discussionThreadId, null);
    });
});