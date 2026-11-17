import {
    MessageFlags,
    type ButtonInteraction,
} from 'discord.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import { canManageDiscussion } from '../services/discussion-permission.service.js';
import { transitionAndSynchronizeDiscussion } from '../services/discussion-lifecycle.service.js';

import {
    createCloseDiscussionModal,
    createDeferDiscussionModal
} from './discussion-modal.component.js';

export async function handleDiscussionButton(
    interaction: ButtonInteraction,
): Promise<void> {
    const [namespace, action, threadId] = interaction.customId.split(':');

    if (namespace !== 'discussion' || !action || !threadId) {
        return;
    }

    if (!interaction.guild) {
        await interaction.reply({
            content: 'This action must be performed inside a server.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        const discussion = discussionRepository.findByThreadId(threadId);

        if (!discussion || discussion.guildId !== interaction.guild.id) {
            await interaction.reply({
                content: 'This discussion could not be found.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const authorized = await canManageDiscussion(
            interaction.guild,
            interaction.user.id,
            discussion.createdBy,
        );

        if (!authorized) {
            await interaction.reply({
                content: 'You do not have permission to manage this discussion.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (action === 'defer') {
            if (discussion.status !== 'OPEN') {
                await interaction.reply({
                    content: 'Only open discussions can be deferred.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.showModal(createDeferDiscussionModal(threadId));
            return;
        }

        if (action === 'close') {
            if (
                discussion.status !== 'OPEN'
                && discussion.status !== 'DEFERRED'
            ) {
                await interaction.reply({
                    content: 'Only open or deferred discussions can be closed.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.showModal(
                createCloseDiscussionModal(threadId),
            );

            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        if (action === 'start') {
            await transitionAndSynchronizeDiscussion(
                interaction.guild,
                {
                    threadId,
                    newStatus: 'OPEN',
                    performedBy: interaction.user.id,
                    reason: 'Discussion started.',
                },
            );

            await interaction.editReply('Discussion successfully started.');
            return;
        }

        if (action === 'resume') {
            if (discussion.status !== 'DEFERRED') {
                await interaction.editReply(
                    'Only deferred discussions can be resumed.',
                );
                return;
            }

            await transitionAndSynchronizeDiscussion(
                interaction.guild,
                {
                    threadId,
                    newStatus: 'OPEN',
                    performedBy: interaction.user.id,
                    reason: 'Discussion resumed.',
                },
            );

            await interaction.editReply(
                'Discussion successfully resumed.',
            );

            return;
        }

        await interaction.editReply('This action is not implemented yet.');
    } catch (error) {
        console.error(`Discussion action "${ action }" failed:`, error);

        const message = 'Failed to process the discussion action. Check the bot logs for details.';

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(message);
        } else {
            await interaction.reply({
                content: message,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}