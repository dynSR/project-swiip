import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { eq } from 'drizzle-orm';

import { decisionRecordVersions } from '../../schema/decision-record-versions.schema.js';
import { decisionRecords } from '../../schema/decision-records.schema.js';
import { discussions } from '../../schema/discussions.schema.js';
import { discussionHistories } from '../../schema/discussion-histories.schema.js';
import { guildConfigurations } from '../../schema/guild-configurations.schema.js';

import { createGuildConfiguration } from '../fixtures/guild-configurations.fixture.js';
import { assertDatabaseIntegrity } from '../helpers/database-integrity.helper.js';
import { createTestDatabase } from '../helpers/database.helper.js';

test('Database relationships should enforce their deletion rules', async (t) => {
    const { db, sqlite, cleanup } = await createTestDatabase();

    t.after(cleanup);

    await t.test(
        'should preserve decision records and delete discussion histories when a discussion is deleted',
        () => {
            const configuration = createGuildConfiguration(db);
            const threadId = randomUUID();

            db.insert(discussions)
            .values({
                threadId,
                guildId: configuration.guildId,
                forumChannelId: 'forum-id',
                archiveChannelId: 'archive-channel-id',
                title: 'Deletion test',
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

            db.insert(discussionHistories)
            .values({
                discussionThreadId: threadId,
                previousStatus: 'OPEN',
                newStatus: 'CLOSED',
                performedBy: 'user-id',
                reason: 'Closing discussion',
            })
            .run();

            db.insert(decisionRecords)
            .values({
                guildId: configuration.guildId,
                discussionThreadId: threadId,
                archiveChannelId: 'archive-channel-id',
                archiveMessageId: randomUUID(),
                title: 'Archived decision',
                category: 'GAMEPLAY',
                initialProposal: 'Initial proposal',
                decision: 'APPROVED',
                finalSummary: 'Final summary',
                createdBy: 'user-id',
            })
            .run();

            db.delete(discussions)
            .where(eq(discussions.threadId, threadId))
            .run();

            const remainingDiscussions = db.select()
            .from(discussions)
            .where(eq(discussions.threadId, threadId))
            .all();

            const remainingHistory = db.select()
            .from(discussionHistories)
            .where(eq(discussionHistories.discussionThreadId, threadId))
            .all();

            const remainingRecord = db.select()
            .from(decisionRecords)
            .all()
            .find(record => record.title === 'Archived decision');

            assert.equal(remainingDiscussions.length, 0);
            assert.equal(remainingHistory.length, 0);
            assert.ok(remainingRecord, 'The decision record should still exist');
            assert.equal(remainingRecord.discussionThreadId, null);
        }
    );

    await t.test('should delete all associated versions when a decision record is deleted', () => {
        const configuration = createGuildConfiguration(db);
        const recordId = randomUUID();

        db.insert(decisionRecords)
        .values({
            id: recordId,
            guildId: configuration.guildId,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: randomUUID(),
            title: 'Version deletion test',
            category: 'GAMEPLAY',
            initialProposal: 'Initial proposal',
            decision: 'APPROVED',
            finalSummary: 'Final summary',
            createdBy: 'user-id',
        })
        .run();

        db.insert(decisionRecordVersions)
        .values({
            decisionRecordId: recordId,
            version: 1,
            title: 'Version deletion test',
            category: 'GAMEPLAY',
            initialProposal: 'Initial proposal',
            decision: 'APPROVED',
            finalSummary: 'Final summary',
            modifiedBy: 'user-id',
            reason: 'Initial version',
        })
        .run();

        db.delete(decisionRecords)
        .where(eq(decisionRecords.id, recordId))
        .run();

        const remainingRecords = db.select()
        .from(decisionRecords)
        .where(eq(decisionRecords.id, recordId))
        .all();

        const remainingVersions = db.select()
        .from(decisionRecordVersions)
        .where(eq(decisionRecordVersions.decisionRecordId, recordId))
        .all();

        assert.equal(remainingRecords.length, 0);
        assert.equal(remainingVersions.length, 0);
    });

    await t.test('should delete all associated data when a guild configuration is deleted', () => {
        const configuration = createGuildConfiguration(db);
        const threadId = randomUUID();
        const recordId = randomUUID();

        db.insert(discussions)
        .values({
            threadId,
            guildId: configuration.guildId,
            forumChannelId: 'forum-id',
            archiveChannelId: 'archive-channel-id',
            title: 'Guild deletion test',
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

        db.insert(discussionHistories)
        .values({
            discussionThreadId: threadId,
            previousStatus: 'OPEN',
            newStatus: 'CLOSED',
            performedBy: 'user-id',
            reason: 'Closing discussion',
        })
        .run();

        db.insert(decisionRecords)
        .values({
            id: recordId,
            guildId: configuration.guildId,
            discussionThreadId: threadId,
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: randomUUID(),
            title: 'Guild deletion test',
            category: 'GAMEPLAY',
            initialProposal: 'Initial proposal',
            decision: 'APPROVED',
            finalSummary: 'Final summary',
            createdBy: 'user-id',
        })
        .run();

        db.insert(decisionRecordVersions)
        .values({
            decisionRecordId: recordId,
            version: 1,
            title: 'Guild deletion test',
            category: 'GAMEPLAY',
            initialProposal: 'Initial proposal',
            decision: 'APPROVED',
            finalSummary: 'Final summary',
            modifiedBy: 'user-id',
            reason: 'Initial version',
        })
        .run();

        db.delete(guildConfigurations)
        .where(eq(guildConfigurations.guildId, configuration.guildId))
        .run();

        assert.equal(
            db.select()
            .from(guildConfigurations)
            .where(eq(guildConfigurations.guildId, configuration.guildId))
            .all().length,
            0,
        );

        assert.equal(
            db.select()
            .from(discussions)
            .where(eq(discussions.threadId, threadId))
            .all().length,
            0,
        );

        assert.equal(
            db.select()
            .from(discussionHistories)
            .where(eq(discussionHistories.discussionThreadId, threadId))
            .all().length,
            0,
        );

        assert.equal(
            db.select()
            .from(decisionRecords)
            .where(eq(decisionRecords.id, recordId))
            .all().length,
            0,
        );

        assert.equal(
            db.select()
            .from(decisionRecordVersions)
            .where(eq(decisionRecordVersions.decisionRecordId, recordId))
            .all().length,
            0,
        );
    });

    assertDatabaseIntegrity(sqlite);
});