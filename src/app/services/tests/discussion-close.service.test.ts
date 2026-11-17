import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
    Guild,
    ModalSubmitInteraction
} from 'discord.js';

import { discussionRepository } from '../../../database/repositories/discussion.repository.js';

import {
    CLOSE_DISCUSSION_MODAL_ID,
    CLOSE_DECISION_INPUT_ID,
    CLOSE_SUMMARY_INPUT_ID,
    CLOSE_NOTES_INPUT_ID,
} from '../../components/discussion-modal.component.js';

import { DISCUSSION_STATUSES } from '../../../shared/constants/discussion.constants.js';

import { prepareDecisionRecord } from '../decision-record.service.js';
import { publishDecisionRecordArchive } from '../decision-record-archive.service.js';

import { createDiscussionCloseService } from '../discussion-close.service.js';

function createInteraction() {
    const calls: string[] = [];

    const interaction = {
        customId: `${ CLOSE_DISCUSSION_MODAL_ID }:thread-1`,
        guild: { id: 'guild-1' } as Guild,
        user: { id: 'user-2' },
        fields: {
            getStringSelectValues: (id: string) => {
                assert.equal(id, CLOSE_DECISION_INPUT_ID);
                return ['APPROVED'];
            },
            getTextInputValue: (id: string) => {
                if (id === CLOSE_SUMMARY_INPUT_ID) {
                    return 'The final decision summary.';
                }

                if (id === CLOSE_NOTES_INPUT_ID) {
                    return 'Additional notes.';
                }

                throw new Error(`Unexpected input: ${ id }`);
            },
        },
        deferReply: async () => {
            calls.push('deferReply');
        },
        editReply: async (content: string) => {
            calls.push(`editReply:${ content }`);
        },
    } as unknown as ModalSubmitInteraction;

    return { interaction, calls };
}

test('Discussion close service', async (t) => {
    await t.test('should archive and delete a discussion successfully', async () => {
        const events: string[] = [];

        const discussion = {
            threadId: 'thread-1',
            guildId: 'guild-1',
            createdBy: 'user-1',
            status: DISCUSSION_STATUSES.OPEN,
        } as NonNullable<ReturnType<typeof discussionRepository.findByThreadId>>;

        const record = {
            id: 'record-1',
        } as ReturnType<typeof prepareDecisionRecord>;

        const archive = {
            messageId: 'archive-message-1',
            record,
        } as Awaited<ReturnType<typeof publishDecisionRecordArchive>>;

        const { interaction, calls } = createInteraction();

        const service = createDiscussionCloseService({
            discussionRepo: {
                ...discussionRepository,
                findByThreadId: () => {
                    events.push('findDiscussion');
                    return discussion;
                },
            },

            canManageDiscussion: async () => {
                events.push('checkPermission');
                return true;
            },

            prepareDecisionRecord: (input) => {
                events.push('prepareRecord');

                assert.deepEqual(input, {
                    threadId: 'thread-1',
                    decision: 'APPROVED',
                    finalSummary: 'The final decision summary.',
                    additionalNotes: 'Additional notes.',
                    performedBy: 'user-2',
                });

                return record;
            },

            publishDecisionRecordArchive: async (...args) => {
                events.push('publishArchive');

                assert.equal(args[0].id, 'guild-1');
                assert.equal(args[1], 'record-1');
                assert.equal(args[2], 'user-2');
                assert.ok(args[3] instanceof Date);

                return archive;
            },

            cleanupArchivedDiscussion: async (guild, threadId) => {
                events.push('cleanupDiscussion');

                assert.equal(guild.id, 'guild-1');
                assert.equal(threadId, 'thread-1');
            },

            logError: (error) => {
                throw error;
            },
        });

        await service.handleCloseDiscussion(interaction);

        assert.deepEqual(events, [
            'findDiscussion',
            'checkPermission',
            'prepareRecord',
            'publishArchive',
            'cleanupDiscussion',
        ]);

        assert.deepEqual(calls, [
            'deferReply',
            'editReply:Decision record successfully archived. Archive message ID: archive-message-1. The original discussion has been deleted.',
        ]);
    });

    async function testValidationFailure(options: {
        expectedMessage?: string;
        customId?: string;
        guild?: Guild | null;
        discussion?: ReturnType<typeof discussionRepository.findByThreadId>;
        authorized?: boolean;
        decision?: string;
        summary?: string;
    }) {
        const { interaction, calls } = createInteraction();

        if (options.customId !== undefined) {
            Object.assign(interaction, { customId: options.customId });
        }

        if (options.guild !== undefined) {
            Object.assign(interaction, { guild: options.guild });
        }

        if (options.decision !== undefined) {
            Object.assign(interaction, {
                fields: {
                    getStringSelectValues: () => [options.decision],
                    getTextInputValue: (id: string) =>
                        id === CLOSE_SUMMARY_INPUT_ID
                            ? options.summary ?? 'A valid summary.'
                            : 'Additional notes.',
                },
            });
        }

        if (options.summary !== undefined && options.decision === undefined) {
            Object.assign(interaction, {
                fields: {
                    getStringSelectValues: () => ['APPROVED'],
                    getTextInputValue: (id: string) =>
                        id === CLOSE_SUMMARY_INPUT_ID
                            ? options.summary!
                            : 'Additional notes.',
                },
            });
        }

        const discussion = {
            threadId: 'thread-1',
            guildId: 'guild-1',
            createdBy: 'user-1',
            status: DISCUSSION_STATUSES.OPEN,
        } as NonNullable<ReturnType<typeof discussionRepository.findByThreadId>>;

        const service = createDiscussionCloseService({
            discussionRepo: {
                ...discussionRepository,
                findByThreadId: () => 'discussion' in options
                    ? options.discussion
                    : discussion,
            },

            canManageDiscussion: async () => options.authorized ?? true,

            prepareDecisionRecord: () => {
                throw new Error('Decision record should not be prepared.');
            },

            publishDecisionRecordArchive: async () => {
                throw new Error('Archive should not be published.');
            },

            cleanupArchivedDiscussion: async () => {
                throw new Error('Discussion should not be deleted.');
            },

            logError: (error) => {
                throw error;
            },
        });

        await service.handleCloseDiscussion(interaction);

        if (options.customId?.startsWith(`${ CLOSE_DISCUSSION_MODAL_ID }:`) === false) {
            assert.deepEqual(calls, []);
            return;
        }

        assert.ok(calls.includes('deferReply'));

        if (options.expectedMessage) {
            assert.ok(
                calls.includes(`editReply:${ options.expectedMessage }`),
                `Expected response: ${ options.expectedMessage }`,
            );
        }
    }

    await t.test('should ignore an unrelated modal interaction', async () => {
        await testValidationFailure({
            customId: 'another-modal:thread-1',
        });
    });

    await t.test('should reject an interaction outside a guild', async () => {
        await testValidationFailure({
            guild: null,
            expectedMessage: 'This action must be performed inside a server.',
        });
    });

    await t.test('should reject a discussion that does not exist', async () => {
        await testValidationFailure({
            discussion: undefined,
            expectedMessage: 'This discussion could not be found.',
        });
    });

    await t.test('should reject a discussion belonging to another guild', async () => {
        const discussion = {
            threadId: 'thread-1',
            guildId: 'another-guild',
            createdBy: 'user-1',
            status: DISCUSSION_STATUSES.OPEN,
        } as NonNullable<ReturnType<typeof discussionRepository.findByThreadId>>;

        await testValidationFailure({
            discussion,
            expectedMessage: 'This discussion could not be found.',
        });
    });

    await t.test('should reject a discussion that is not open or deferred', async () => {
        for (const status of [
            DISCUSSION_STATUSES.NEW,
            DISCUSSION_STATUSES.CLOSED,
        ]) {
            const discussion = {
                threadId: 'thread-1',
                guildId: 'guild-1',
                createdBy: 'user-1',
                status,
            } as NonNullable<ReturnType<typeof discussionRepository.findByThreadId>>;

            await testValidationFailure({
                discussion,
                expectedMessage: 'Only open or deferred discussions can be closed.',
            });
        }
    });

    await t.test('should reject users without management permissions', async () => {
        await testValidationFailure({
            authorized: false,
            expectedMessage: 'You do not have permission to close this discussion.',
        });
    });

    await t.test('should reject an invalid decision outcome', async () => {
        await testValidationFailure({
            decision: 'INVALID_DECISION',
            expectedMessage: 'The selected decision is invalid.',
        });
    });

    await t.test('should reject an empty final summary', async () => {
        await testValidationFailure({
            summary: '   ',
            expectedMessage: 'A final summary is required.',
        });
    });
});