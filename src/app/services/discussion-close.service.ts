import {
    MessageFlags,
    type ModalSubmitInteraction,
} from 'discord.js';

import {
    DECISION_OUTCOMES,
    DISCUSSION_STATUSES,
} from '../../shared/constants/discussion.constants.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import { publishDecisionRecordArchive } from './decision-record-archive.service.js';
import { prepareDecisionRecord } from './decision-record.service.js';
import { cleanupArchivedDiscussion } from './discussion-cleanup.service.js';
import { canManageDiscussion } from './discussion-permission.service.js';

import {
    CLOSE_DISCUSSION_MODAL_ID,
    CLOSE_DECISION_INPUT_ID,
    CLOSE_SUMMARY_INPUT_ID,
    CLOSE_NOTES_INPUT_ID,
} from '../components/discussion-modal.component.js';

type DecisionOutcome = typeof DECISION_OUTCOMES[keyof typeof DECISION_OUTCOMES];

interface DiscussionCloseDependencies {
    discussionRepo: typeof discussionRepository;
    canManageDiscussion: typeof canManageDiscussion;
    prepareDecisionRecord: typeof prepareDecisionRecord;
    publishDecisionRecordArchive: typeof publishDecisionRecordArchive;
    cleanupArchivedDiscussion: typeof cleanupArchivedDiscussion;
    logError: (error: unknown) => void;
}

export function createDiscussionCloseService(
    dependencies: Partial<DiscussionCloseDependencies> = {},
) {
    const {
        discussionRepo = discussionRepository,
        canManageDiscussion: canManage = canManageDiscussion,
        prepareDecisionRecord: prepareRecord = prepareDecisionRecord,
        publishDecisionRecordArchive: publishArchive = publishDecisionRecordArchive,
        cleanupArchivedDiscussion: cleanupDiscussion = cleanupArchivedDiscussion,
        logError = (error) => console.error('[Discussion Close] Failed:', error),
    } = dependencies;

    return {
        async handleCloseDiscussion(
            interaction: ModalSubmitInteraction,
        ): Promise<void> {
            const [modalId, threadId] = interaction.customId.split(':');

            if (modalId !== CLOSE_DISCUSSION_MODAL_ID || !threadId) {
                return;
            }

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral,
            });

            const guild = interaction.guild;

            if (!guild) {
                await interaction.editReply(
                    'This action must be performed inside a server.',
                );
                return;
            }

            try {
                const discussion = discussionRepo.findByThreadId(threadId);

                if (!discussion || discussion.guildId !== guild.id) {
                    await interaction.editReply(
                        'This discussion could not be found.',
                    );
                    return;
                }

                if (
                    discussion.status !== DISCUSSION_STATUSES.OPEN
                    && discussion.status !== DISCUSSION_STATUSES.DEFERRED
                ) {
                    await interaction.editReply(
                        'Only open or deferred discussions can be closed.',
                    );
                    return;
                }

                const authorized = await canManage(
                    guild,
                    interaction.user.id,
                    discussion.createdBy,
                );

                if (!authorized) {
                    await interaction.editReply(
                        'You do not have permission to close this discussion.',
                    );
                    return;
                }

                const decision = interaction.fields
                .getStringSelectValues(CLOSE_DECISION_INPUT_ID)[0];

                if (!Object.values(DECISION_OUTCOMES).includes(decision as DecisionOutcome)) {
                    await interaction.editReply(
                        'The selected decision is invalid.',
                    );
                    return;
                }

                const finalSummary = interaction.fields
                .getTextInputValue(CLOSE_SUMMARY_INPUT_ID)
                .trim();

                const additionalNotes = interaction.fields
                .getTextInputValue(CLOSE_NOTES_INPUT_ID)
                .trim();

                if (!finalSummary) {
                    await interaction.editReply(
                        'A final summary is required.',
                    );
                    return;
                }

                const record = prepareRecord({
                    threadId,
                    decision: decision as DecisionOutcome,
                    finalSummary,
                    additionalNotes: additionalNotes || null,
                    performedBy: interaction.user.id,
                });

                const archive = await publishArchive(
                    guild,
                    record.id,
                    interaction.user.id,
                    new Date(),
                );

                await cleanupDiscussion(guild, threadId);

                await interaction.editReply(
                    `Decision record successfully archived. Archive message ID: ${archive.messageId}. The original discussion has been deleted.`,
                );
            } catch (error) {
                logError(error);

                await interaction.editReply(
                    'Failed to process the closing information. Check the bot logs for details.',
                );
            }
        },
    };
}

export const { handleCloseDiscussion } = createDiscussionCloseService();