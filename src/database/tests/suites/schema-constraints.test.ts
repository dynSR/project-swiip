import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { decisionRecordVersions } from '../../schema/decision-record-versions.schema.js';
import { decisionRecords } from '../../schema/decision-records.schema.js';
import { discussions } from '../../schema/discussions.schema.js';
import { discussionHistories } from '../../schema/discussion-histories.schema.js';
import { guildConfigurations } from '../../schema/guild-configurations.schema.js';

import { createGuildConfiguration } from '../fixtures/guild-configurations.fixture.js';
import { assertSqliteConstraintViolation } from '../helpers/assertions.helper.js';
import { createTestDatabase } from '../helpers/database.helper.js';

test('Database schemas should enforce their constraints', async (t) => {
    const { sqlite, db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    await t.test('Guild configurations should enforce their constraints', async (t) => {
        const configuration = createGuildConfiguration(db);

        await t.test('should reject a guild configuration with an existing guild ID', () => {
            assertSqliteConstraintViolation(
                () => {
                    db.insert(guildConfigurations)
                    .values(configuration)
                    .run();
                },
                'UNIQUE constraint failed',
            );
        });

        await t.test('should reject a guild configuration without a forum channel ID', () => {
            assertSqliteConstraintViolation(
                () => {
                    sqlite.prepare(`
                        INSERT INTO guild_configurations (guild_id,
                                                          archive_channel_id,
                                                          created_at,
                                                          updated_at)
                        VALUES (?, ?, ?, ?)
                    `).run(
                        'guild-missing-forum',
                        'archive-channel-id',
                        Date.now(),
                        Date.now(),
                    );
                },
                'NOT NULL constraint failed',
            );
        });

        await t.test('should reject a guild configuration without an archive channel ID', () => {
            assertSqliteConstraintViolation(
                () => {
                    sqlite.prepare(`
                        INSERT INTO guild_configurations (guild_id,
                                                          forum_channel_id,
                                                          created_at,
                                                          updated_at)
                        VALUES (?, ?, ?, ?)
                    `).run(
                        'guild-missing-archive',
                        'forum-channel-id',
                        Date.now(),
                        Date.now(),
                    );
                },
                'NOT NULL constraint failed',
            );
        });
    });

    await t.test('Discussions should enforce their constraints', async (t) => {
        const configuration = createGuildConfiguration(db);

        await t.test('should reject a discussion referencing a non-existent guild', () => {
            assertSqliteConstraintViolation(
                () => {
                    db.insert(discussions)
                    .values({
                        threadId: 'thread-invalid-guild',
                        guildId: 'non-existent-guild',
                        forumChannelId: 'forum-id',
                        archiveChannelId: 'archive-channel-id',
                        title: 'Test discussion',
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
                },
                'FOREIGN KEY constraint failed',
            );
        });

        await t.test('should reject a discussion without an archive channel ID', () => {
            const invalidDiscussion = {
                threadId: 'thread-missing-archive-channel',
                guildId: configuration.guildId,
                forumChannelId: configuration.forumChannelId,
                archiveChannelId: null,
                title: 'Test discussion',
                context: 'Test context',
                proposal: 'Test proposal',
                category: 'GAMEPLAY',
                level: 'QUICK',
                status: 'NEW',
                createdBy: 'test-user',
                starterMessageId: 'starter-message-id',
                controlsMessageId: 'controls-message-id',
                historySummaryMessageId: 'history-summary-message-id',
            };

            assertSqliteConstraintViolation(
                () => {
                    db.insert(discussions)
                    .values(invalidDiscussion as never)
                    .run();
                },
                'NOT NULL constraint failed: discussions.archive_channel_id',
            );
        });

        await t.test('should reject a discussion with a title exceeding 150 characters', () => {
            assertSqliteConstraintViolation(
                () => {
                    db.insert(discussions)
                    .values({
                        threadId: 'thread-long-title',
                        guildId: configuration.guildId,
                        forumChannelId: 'forum-id',
                        archiveChannelId: 'archive-channel-id',
                        title: 'A'.repeat(151),
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
                },
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a discussion with an unsupported status', () => {
            assertSqliteConstraintViolation(
                () => {
                    db.insert(discussions)
                    .values({
                        threadId: 'thread-invalid-status',
                        guildId: configuration.guildId,
                        forumChannelId: 'forum-id',
                        archiveChannelId: 'archive-channel-id',
                        title: 'Test discussion',
                        context: 'Test context',
                        proposal: 'Test proposal',
                        category: 'GAMEPLAY',
                        level: 'QUICK',
                        status: 'INVALID' as 'NEW',
                        createdBy: 'user-id',
                        starterMessageId: 'starter-id',
                        controlsMessageId: 'controls-id',
                        historySummaryMessageId: 'summary-id',
                    })
                    .run();
                },
                'CHECK constraint failed',
            );
        });
    });

    await t.test('Discussion histories should enforce their constraints', async (t) => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        db.insert(discussions)
        .values({
            threadId,
            guildId: configuration.guildId,
            forumChannelId: 'forum-id',
            archiveChannelId: 'archive-channel-id',
            title: 'History test discussion',
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

        await t.test('should reject a history entry referencing a non-existent discussion', () => {
            assertSqliteConstraintViolation(
                () => {
                    db.insert(discussionHistories)
                    .values({
                        discussionThreadId: 'non-existent-thread',
                        previousStatus: 'NEW',
                        newStatus: 'OPEN',
                        performedBy: 'user-id',
                        reason: 'Starting discussion',
                    })
                    .run();
                },
                'FOREIGN KEY constraint failed',
            );
        });

        await t.test('should reject a status transition that is not allowed', () => {
            assertSqliteConstraintViolation(
                () => {
                    sqlite.prepare(`
                        INSERT INTO discussion_histories (id,
                                                          discussion_thread_id,
                                                          previous_status,
                                                          new_status,
                                                          performed_by,
                                                          reason,
                                                          created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        randomUUID(),
                        threadId,
                        'NEW',
                        'CLOSED',
                        'user-id',
                        'Invalid transition',
                        Date.now(),
                    );
                },
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a history entry with an empty reason', () => {
            assertSqliteConstraintViolation(
                () => {
                    sqlite.prepare(`
                        INSERT INTO discussion_histories (id,
                                                          discussion_thread_id,
                                                          previous_status,
                                                          new_status,
                                                          performed_by,
                                                          reason,
                                                          created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        randomUUID(),
                        threadId,
                        'NEW',
                        'OPEN',
                        'user-id',
                        '   ',
                        Date.now(),
                    );
                },
                'CHECK constraint failed',
            );
        });
    });

    await t.test('Decision records should enforce their constraints', async (t) => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();

        db.insert(discussions)
        .values({
            threadId,
            guildId: configuration.guildId,
            forumChannelId: 'forum-id',
            archiveChannelId: 'archive-channel-id',
            title: 'Decision record test',
            context: 'Test context',
            proposal: 'Test proposal',
            category: 'GAMEPLAY',
            level: 'QUICK',
            status: 'CLOSED',
            createdBy: 'user-id',
            starterMessageId: 'starter-id',
            controlsMessageId: 'controls-id',
            historySummaryMessageId: 'summary-id',
        })
        .run();

        const insertDecisionRecord = sqlite.prepare(`
            INSERT INTO decision_records (id,
                                          guild_id,
                                          discussion_thread_id,
                                          archive_channel_id,
                                          archive_message_id,
                                          title,
                                          category,
                                          initial_proposal,
                                          decision,
                                          final_summary,
                                          additional_notes,
                                          created_by,
                                          created_at,
                                          updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertValidDecisionRecord = (overrides: {
            guildId?: string;
            discussionThreadId?: string | null;
            archiveMessageId?: string;
            title?: string;
            decision?: string;
            finalSummary?: string;
        } = {}) => {
            insertDecisionRecord.run(
                randomUUID(),
                overrides.guildId ?? configuration.guildId,
                overrides.discussionThreadId ?? null,
                'archive-channel-id',
                overrides.archiveMessageId ?? randomUUID(),
                overrides.title ?? 'Test decision',
                'GAMEPLAY',
                'Initial proposal',
                overrides.decision ?? 'APPROVED',
                overrides.finalSummary ?? 'Final summary',
                null,
                'user-id',
                Date.now(),
                Date.now(),
            );
        };

        await t.test('should reject a decision record referencing a non-existent guild', () => {
            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({
                    guildId: 'non-existent-guild',
                }),
                'FOREIGN KEY constraint failed',
            );
        });

        await t.test('should reject a decision record with an archive message ID that already exists', () => {
            const archiveMessageId = randomUUID();

            insertValidDecisionRecord({ archiveMessageId });

            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({ archiveMessageId }),
                'UNIQUE constraint failed',
            );
        });

        await t.test('should reject a second decision record for the same discussion', () => {
            insertValidDecisionRecord({
                discussionThreadId: threadId,
            });

            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({
                    discussionThreadId: threadId,
                }),
                'UNIQUE constraint failed',
            );
        });

        await t.test('should reject a decision record with an unsupported decision value', () => {
            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({
                    decision: 'INVALID',
                }),
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a decision record with an empty final summary', () => {
            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({
                    finalSummary: '   ',
                }),
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a decision record with a title exceeding 150 characters', () => {
            assertSqliteConstraintViolation(
                () => insertValidDecisionRecord({
                    title: 'A'.repeat(151),
                }),
                'CHECK constraint failed',
            );
        });
    });

    await t.test('Decision record versions should enforce their constraints', async (t) => {
        const configuration = createGuildConfiguration(db);

        const insertDecisionRecord = () => {
            const id = randomUUID();

            db.insert(decisionRecords)
            .values({
                id,
                guildId: configuration.guildId,
                archiveChannelId: 'archive-channel-id',
                archiveMessageId: randomUUID(),
                title: 'Test decision',
                category: 'GAMEPLAY',
                initialProposal: 'Initial proposal',
                decision: 'APPROVED',
                finalSummary: 'Final summary',
                createdBy: 'user-id',
            })
            .run();

            return id;
        };

        const insertVersion = (
            decisionRecordId: string,
            overrides: {
                version?: number;
                title?: string;
                reason?: string;
            } = {},
        ) => {
            db.insert(decisionRecordVersions)
            .values({
                decisionRecordId,
                version: overrides.version ?? 1,
                title: overrides.title ?? 'Test decision',
                category: 'GAMEPLAY',
                initialProposal: 'Initial proposal',
                decision: 'APPROVED',
                finalSummary: 'Final summary',
                modifiedBy: 'user-id',
                reason: overrides.reason ?? 'Updated decision record',
            })
            .run();
        };

        await t.test('should reject a version referencing a non-existent decision record', () => {
            assertSqliteConstraintViolation(
                () => insertVersion('non-existent-record'),
                'FOREIGN KEY constraint failed',
            );
        });

        await t.test('should reject a version number that is not positive', () => {
            const recordId = insertDecisionRecord();

            assertSqliteConstraintViolation(
                () => insertVersion(recordId, { version: 0 }),
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a duplicate version number for the same decision record', () => {
            const recordId = insertDecisionRecord();

            insertVersion(recordId, { version: 1 });

            assertSqliteConstraintViolation(
                () => insertVersion(recordId, { version: 1 }),
                'UNIQUE constraint failed',
            );
        });

        await t.test('should reject a version title exceeding 150 characters', () => {
            const recordId = insertDecisionRecord();

            assertSqliteConstraintViolation(
                () => insertVersion(recordId, {
                    title: 'A'.repeat(151),
                }),
                'CHECK constraint failed',
            );
        });

        await t.test('should reject a version with an empty reason', () => {
            const recordId = insertDecisionRecord();

            assertSqliteConstraintViolation(
                () => insertVersion(recordId, {
                    reason: '   ',
                }),
                'CHECK constraint failed',
            );
        });
    });
});