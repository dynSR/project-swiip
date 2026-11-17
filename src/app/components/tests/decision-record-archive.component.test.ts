import assert from 'node:assert/strict';
import test from 'node:test';

import { createDecisionRecordArchiveEmbed } from '../decision-record-archive.component.js';

import type { DecisionRecordArchiveData } from '../decision-record-archive.component.js';

test('Decision record archive component should format decision records correctly', async (t) => {
    const data: DecisionRecordArchiveData = {
        record: {
            id: 'record-id',
            guildId: 'guild-id',
            discussionThreadId: 'thread-id',
            archiveChannelId: 'archive-channel-id',
            archiveMessageId: null,
            title: 'Test discussion',
            category: 'GAMEPLAY',
            initialProposal: 'Initial proposal.',
            decision: 'APPROVED',
            finalSummary: 'The proposal was approved.',
            additionalNotes: 'Implementation planned for next sprint.',
            createdBy: 'creator-id',
            createdAt: new Date('2026-01-01T10:00:00Z'),
            updatedAt: new Date('2026-01-01T10:00:00Z'),
        },
        participants: [
            { userId: 'user-1', displayName: 'Alice' },
            { userId: 'user-2', displayName: 'Bob' },
        ],
        history: [
            {
                id: 'history-id',
                discussionThreadId: 'thread-id',
                previousStatus: 'NEW',
                newStatus: 'OPEN',
                performedBy: 'user-1',
                reason: 'Discussion started.',
                createdAt: new Date('2026-01-01T10:00:00Z'),
            },
        ],
        closedBy: 'user-1',
        closedAt: new Date('2026-01-01T12:00:00Z'),
    };

    const embed = createDecisionRecordArchiveEmbed(data);
    const result = embed.toJSON();

    assert.equal(result.title, 'Test discussion');
    assert.match(result.description ?? '', /Approved/);

    assert.ok(result.fields?.some(
        field => field.name === 'Initial proposal'
            && field.value === 'Initial proposal.',
    ));

    assert.ok(result.fields?.some(
        field => field.name === 'Final summary'
            && field.value === 'The proposal was approved.',
    ));

    assert.ok(result.fields?.some(
        field => field.name === 'Participants (2)'
            && field.value.includes('Alice')
            && field.value.includes('Bob'),
    ));

    assert.ok(result.fields?.some(
        field => field.name === 'Discussion history'
            && field.value.includes('New → Open'),
    ));

    assert.ok(result.fields?.some(
        field => field.name === 'Closure'
            && field.value.includes('user-1'),
    ));

    const longHistory = Array.from({ length: 10 }, (_, index) => ({
        ...data.history[0]!,
        id: `history-${ index }`,
        reason: `Reason ${ index }: ${ 'x'.repeat(500) }`,
        createdAt: new Date(`2026-01-01T${ String(index).padStart(2, '0') }:00:00Z`),
    }));

    const longEmbed = createDecisionRecordArchiveEmbed({
        ...data,
        history: longHistory,
    });

    const historyField = longEmbed.toJSON().fields?.find(
        field => field.name === 'Discussion history',
    );

    assert.ok(historyField);
    assert.ok(historyField.value.length <= 1024);
    assert.match(historyField.value, /earlier transition\(s\) omitted/);
    assert.match(historyField.value, /Reason 9:/);
    assert.doesNotMatch(historyField.value, /Reason 0:/);

    await t.test('should respect Discord global embed character limits', () => {
        const configuration: DecisionRecordArchiveData = {
            ...data,
            record: {
                ...data.record,
                title: 'T'.repeat(150),
                initialProposal: 'P'.repeat(5000),
                finalSummary: 'S'.repeat(5000),
                additionalNotes: 'N'.repeat(5000),
            },
            participants: Array.from({ length: 100 }, (_, index) => ({
                userId: `user-${ index }`,
                displayName: `Participant ${ index }`,
            })),
            history: Array.from({ length: 100 }, (_, index) => ({
                ...data.history[0]!,
                id: `history-${ index }`,
                reason: 'R'.repeat(500),
            })),
        };

        const result = createDecisionRecordArchiveEmbed(configuration).toJSON();

        const totalCharacters =
            (result.title?.length ?? 0) +
            (result.description?.length ?? 0) +
            (result.fields ?? []).reduce(
                (total, field) => total + field.name.length + field.value.length,
                0,
            );

        assert.ok(
            totalCharacters <= 6000,
            `Embed contains ${ totalCharacters } characters, exceeding Discord's 6000-character limit.`,
        );
    });
});