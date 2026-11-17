import assert from 'node:assert/strict';
import { randomUUID } from "node:crypto";
import test from 'node:test';

import type { Guild } from 'discord.js';
import { Collection } from 'discord.js';

import {
    createDecisionRecordRepository,
    decisionRecordRepository
} from '../../../database/repositories/decision-record.repository.js';
import { createDiscussionHistoryRepository } from '../../../database/repositories/discussion-history.repository.js';

import { createDecisionRecord } from '../../../database/tests/fixtures/decision-records.fixture.js';
import { createDiscussion } from '../../../database/tests/fixtures/discussions.fixture.js';
import { createGuildConfiguration } from '../../../database/tests/fixtures/guild-configurations.fixture.js';
import { createTestDatabase } from '../../../database/tests/helpers/database.helper.js';

import { getTextChannel } from '../../../shared/helpers/channel.helpers.js';

import { createDecisionRecordArchiveService } from '../decision-record-archive.service.js';

test('Decision record archive service should publish an archive successfully', async (t) => {
    const { db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    const decisionRecordRepository = createDecisionRecordRepository(db);
    const discussionHistoryRepository = createDiscussionHistoryRepository(db);

    const configuration = createGuildConfiguration(db);
    const threadId = 'test-thread-id';

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
        archiveMessageId: null,
        title: 'Test discussion',
        category: 'GAMEPLAY',
        initialProposal: 'Test proposal',
        decision: 'APPROVED',
        finalSummary: 'The proposal was approved.',
        createdBy: 'test-user-id',
    });

    const record = decisionRecordRepository.findByDiscussionThreadId(threadId);

    assert.ok(record);

    const archiveMessageId = 'archive-message-id';

    let publishedEmbeds: unknown[] = [];
    let publicationCount = 0;

    const archiveChannel = {
        messages: {
            fetch: async () => new Collection(),
        },
        send: async (payload: { embeds: unknown[] }) => {
            publicationCount++;
            publishedEmbeds = payload.embeds;

            return { id: archiveMessageId };
        },
    } as unknown as Awaited<ReturnType<typeof getTextChannel>>;

    const archiveService = createDecisionRecordArchiveService({
        decisionRecordRepo: decisionRecordRepository,
        discussionHistoryRepo: discussionHistoryRepository,

        getTextChannel: async (_guild, channelId) => {
            assert.equal(channelId, 'archive-channel-id');
            return archiveChannel;
        },

        getDiscussionParticipants: async (_guild, requestedThreadId) => {
            assert.equal(requestedThreadId, threadId);

            return [
                {
                    userId: 'participant-id',
                    displayName: 'Test participant',
                },
            ];
        },
    });

    const guild = {
        id: configuration.guildId,
    } as Guild;

    const closedAt = new Date();

    const result = await archiveService.publishDecisionRecordArchive(
        guild,
        record.id,
        'test-user-id',
        closedAt,
    );

    assert.equal(publicationCount, 1);
    assert.equal(result.messageId, archiveMessageId);
    assert.equal(result.record.archiveMessageId, archiveMessageId);

    assert.equal(publishedEmbeds.length, 1);

    const savedRecord = decisionRecordRepository.findById(record.id);

    assert.ok(savedRecord);
    assert.equal(savedRecord.archiveMessageId, archiveMessageId);

    await t.test('should reuse an existing archive message instead of publishing a duplicate', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const threadId = 'existing-archive-thread-id';

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
            archiveMessageId: null,
            title: 'Existing archive discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            createdBy: 'test-user-id',
        });

        const record = decisionRecordRepository.findByDiscussionThreadId(threadId);

        assert.ok(record);

        const existingMessageId = 'existing-archive-message-id';
        const marker = `Decision record: ${ record.id }`;

        let publicationCount = 0;

        const existingMessage = {
            id: existingMessageId,
            embeds: [
                {
                    footer: {
                        text: marker,
                    },
                },
            ],
        };

        const archiveChannel = {
            messages: {
                fetch: async () => {
                    const messages = new Collection();
                    messages.set(existingMessageId, existingMessage as never);
                    return messages;
                },
            },
            send: async () => {
                publicationCount++;
                throw new Error('An existing archive must not be published again.');
            },
        } as unknown as Awaited<ReturnType<typeof getTextChannel>>;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => archiveChannel,
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        const result = await archiveService.publishDecisionRecordArchive(
            guild,
            record.id,
            'test-user-id',
            new Date(),
        );

        assert.equal(publicationCount, 0);
        assert.equal(result.messageId, existingMessageId);
        assert.equal(result.record.archiveMessageId, existingMessageId);

        const savedRecord = decisionRecordRepository.findById(record.id);

        assert.ok(savedRecord);
        assert.equal(savedRecord.archiveMessageId, existingMessageId);
    });

    await t.test('should recover an archive when saving its message ID initially fails', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const threadId = 'recovery-archive-thread-id';

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
            archiveMessageId: null,
            title: 'Recovery discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            createdBy: 'test-user-id',
        });

        const record = decisionRecordRepository.findByDiscussionThreadId(threadId);

        assert.ok(record);

        const publishedMessageId = 'recovered-archive-message-id';

        let publicationCount = 0;
        let updateCount = 0;

        const messages = new Collection();

        const archiveChannel = {
            messages: {
                fetch: async () => messages,
            },
            send: async (payload: { embeds: { data: { footer?: { text?: string } } }[] }) => {
                publicationCount++;

                const footer = payload.embeds[0]?.data.footer;

                messages.set(publishedMessageId, {
                    id: publishedMessageId,
                    embeds: [
                        {
                            footer,
                        },
                    ],
                } as never);

                return { id: publishedMessageId };
            },
        } as unknown as Awaited<ReturnType<typeof getTextChannel>>;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: {
                ...decisionRecordRepository,

                updateArchiveMessageId: (id, messageId) => {
                    updateCount++;

                    if (updateCount === 1) {
                        return undefined;
                    }

                    return decisionRecordRepository.updateArchiveMessageId(id, messageId);
                },
            },
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => archiveChannel,
            getDiscussionParticipants: async () => [],
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        await assert.rejects(
            () => archiveService.publishDecisionRecordArchive(
                guild,
                record.id,
                'test-user-id',
                new Date(),
            ),
            {
                message: new RegExp(`Archive message "${publishedMessageId}" was published`),
            },
        );

        assert.equal(publicationCount, 1);

        const result = await archiveService.publishDecisionRecordArchive(
            guild,
            record.id,
            'test-user-id',
            new Date(),
        );

        assert.equal(publicationCount, 1);
        assert.equal(result.messageId, publishedMessageId);
        assert.equal(result.record.archiveMessageId, publishedMessageId);
        assert.equal(updateCount, 2);
    });

    await t.test('should reuse the saved archive message ID without fetching or publishing messages', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const threadId = 'saved-archive-thread-id';
        const existingMessageId = 'already-saved-archive-message-id';

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
            archiveMessageId: existingMessageId,
            title: 'Saved archive discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            createdBy: 'test-user-id',
        });

        const record = decisionRecordRepository.findByDiscussionThreadId(threadId);

        assert.ok(record);

        let channelFetchCount = 0;
        let messageFetchCount = 0;
        let publicationCount = 0;
        let participantFetchCount = 0;

        const archiveChannel = {
            messages: {
                fetch: async () => {
                    messageFetchCount++;
                    return new Collection();
                },
            },
            send: async () => {
                publicationCount++;
                throw new Error('An existing archive must not be published again.');
            },
        } as unknown as Awaited<ReturnType<typeof getTextChannel>>;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,

            getTextChannel: async () => {
                channelFetchCount++;
                return archiveChannel;
            },

            getDiscussionParticipants: async () => {
                participantFetchCount++;
                return [];
            },
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        const result = await archiveService.publishDecisionRecordArchive(
            guild,
            record.id,
            'test-user-id',
            new Date(),
        );

        assert.equal(result.messageId, existingMessageId);
        assert.equal(result.record.archiveMessageId, existingMessageId);

        assert.equal(channelFetchCount, 0);
        assert.equal(messageFetchCount, 0);
        assert.equal(publicationCount, 0);
        assert.equal(participantFetchCount, 0);

        const savedRecord = decisionRecordRepository.findById(record.id);

        assert.ok(savedRecord);
        assert.equal(savedRecord.archiveMessageId, existingMessageId);
    });

    await t.test('should reject when the decision record does not exist', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        let channelFetchCount = 0;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,

            getTextChannel: async () => {
                channelFetchCount++;
                throw new Error('The archive channel should not be fetched.');
            },
        });

        const guild = {
            id: 'test-guild-id',
        } as Guild;

        await assert.rejects(
            () => archiveService.publishDecisionRecordArchive(
                guild,
                'non-existent-record-id',
                'test-user-id',
                new Date(),
            ),
            {
                message: 'Decision record "non-existent-record-id" was not found.',
            },
        );

        assert.equal(channelFetchCount, 0);
    });

    await t.test('should reject when the decision record belongs to another guild', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const threadId = 'foreign-guild-thread-id';

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'archive-channel-id',
            status: 'OPEN',
        });

        const record = decisionRecordRepository.create({
            guildId: configuration.guildId,
            discussionThreadId: threadId,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: null,
            title: 'Foreign guild discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            createdBy: 'test-user-id',
        });

        let channelFetchCount = 0;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => {
                channelFetchCount++;
                throw new Error('The archive channel should not be fetched.');
            },
        });

        const guild = {
            id: 'another-guild-id',
        } as Guild;

        await assert.rejects(
            () => archiveService.publishDecisionRecordArchive(
                guild,
                record.id,
                'test-user-id',
                new Date(),
            ),
            {
                message: 'The decision record belongs to another server.',
            },
        );

        assert.equal(channelFetchCount, 0);
    });

    await t.test('should preserve the decision record when archive publication fails', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const threadId = 'failed-publication-thread-id';

        await createDiscussion(db, {
            threadId,
            guildId: configuration.guildId,
            createdBy: 'test-user-id',
            archiveChannelId: 'archive-channel-id',
            status: 'OPEN',
        });

        const record = decisionRecordRepository.create({
            guildId: configuration.guildId,
            discussionThreadId: threadId,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: null,
            title: 'Failed publication discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            createdBy: 'test-user-id',
        });

        const publicationError = new Error('Discord publication failed.');

        let publicationCount = 0;

        const archiveChannel = {
            messages: {
                fetch: async () => new Collection(),
            },
            send: async () => {
                publicationCount++;
                throw publicationError;
            },
        } as unknown as Awaited<ReturnType<typeof getTextChannel>>;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => archiveChannel,
            getDiscussionParticipants: async () => [],
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        await assert.rejects(
            () => archiveService.publishDecisionRecordArchive(
                guild,
                record.id,
                'test-user-id',
                new Date(),
            ),
            (error: Error) => error === publicationError,
        );

        assert.equal(publicationCount, 1);

        const savedRecord = decisionRecordRepository.findById(record.id);

        assert.ok(savedRecord);
        assert.equal(savedRecord.archiveMessageId, null);
    });

    await t.test('should reject when the decision record has no associated discussion', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);

        const record = decisionRecordRepository.create({
            guildId: configuration.guildId,
            discussionThreadId: null,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: null,
            title: 'Detached decision record',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            createdBy: 'test-user-id',
        });

        let channelFetchCount = 0;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => {
                channelFetchCount++;
                throw new Error('The archive channel should not be fetched.');
            },
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        await assert.rejects(
            () => archiveService.publishDecisionRecordArchive(
                guild,
                record.id,
                'test-user-id',
                new Date(),
            ),
            (error: Error) => /discussion/i.test(error.message),
        );

        assert.equal(channelFetchCount, 0);
    });

    await t.test('should reuse an existing archive after its discussion has been deleted', async () => {
        const { db, cleanup } = await createTestDatabase();

        t.after(cleanup);

        const decisionRecordRepository = createDecisionRecordRepository(db);
        const discussionHistoryRepository = createDiscussionHistoryRepository(db);

        const configuration = createGuildConfiguration(db);
        const existingMessageId = 'preserved-archive-message-id';

        const record = decisionRecordRepository.create({
            guildId: configuration.guildId,
            discussionThreadId: null,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: existingMessageId,
            title: 'Previously archived discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Test proposal',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: null,
            createdBy: 'test-user-id',
        });

        let channelFetchCount = 0;

        const archiveService = createDecisionRecordArchiveService({
            decisionRecordRepo: decisionRecordRepository,
            discussionHistoryRepo: discussionHistoryRepository,
            getTextChannel: async () => {
                channelFetchCount++;
                throw new Error('The archive channel should not be fetched.');
            },
        });

        const guild = {
            id: configuration.guildId,
        } as Guild;

        const result = await archiveService.publishDecisionRecordArchive(
            guild,
            record.id,
            'test-user-id',
            new Date(),
        );

        assert.equal(result.messageId, existingMessageId);
        assert.equal(result.record.discussionThreadId, null);
        assert.equal(result.record.archiveMessageId, existingMessageId);
        assert.equal(channelFetchCount, 0);
    });
});