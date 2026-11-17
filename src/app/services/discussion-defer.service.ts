import {
    MessageFlags,
    type ModalSubmitInteraction,
} from 'discord.js';

import { DISCUSSION_STATUSES } from '../../shared/constants/discussion.constants.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import { canManageDiscussion } from './discussion-permission.service.js';
import { transitionAndSynchronizeDiscussion } from './discussion-lifecycle.service.js';

import {
    DEFER_REASON_INPUT_ID,
    DEFER_DISCUSSION_MODAL_ID,
} from '../components/discussion-modal.component.js';

export async function handleDeferDiscussion(
    interaction: ModalSubmitInteraction,
): Promise<void> {
    const [modalId, threadId] = interaction.customId.split(':');

    if (modalId !== DEFER_DISCUSSION_MODAL_ID || !threadId) {
        return;
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    if (!interaction.guild) {
        await interaction.editReply(
            'This action must be performed inside a server.',
        );
        return;
    }

    try {
        const discussion = discussionRepository.findByThreadId(threadId);

        if (!discussion || discussion.guildId !== interaction.guild.id) {
            await interaction.editReply(
                'This discussion could not be found.',
            );
            return;
        }

        if (discussion.status !== DISCUSSION_STATUSES.OPEN) {
            await interaction.editReply(
                'Only open discussions can be deferred.',
            );
            return;
        }

        const authorized = await canManageDiscussion(
            interaction.guild,
            interaction.user.id,
            discussion.createdBy,
        );

        if (!authorized) {
            await interaction.editReply(
                'You do not have permission to manage this discussion.',
            );
            return;
        }

        const reason = interaction.fields
        .getTextInputValue(DEFER_REASON_INPUT_ID)
        .trim();

        if (!reason) {
            await interaction.editReply(
                'A reason is required to defer a discussion.',
            );
            return;
        }

        await transitionAndSynchronizeDiscussion(
            interaction.guild,
            {
                threadId,
                newStatus: DISCUSSION_STATUSES.DEFERRED,
                performedBy: interaction.user.id,
                reason,
            },
        );

        await interaction.editReply(
            'Discussion successfully deferred.',
        );
    } catch (error) {
        console.error('Discussion deferral failed:', error);

        await interaction.editReply(
            'Failed to defer the discussion. Check the bot logs for details.',
        );
    }
}