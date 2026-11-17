import {
    EmbedBuilder,
    type ModalSubmitInteraction,
} from 'discord.js';

import { DISCUSSION_STATUSES } from '../../shared/constants/discussion.constants.js';

import { guildConfigurationRepository } from '../../database/repositories/guild-configuration.repository.js';
import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import { getForumChannel } from '../../shared/helpers/channel.helpers.js';
import { getDiscussionTagIds } from '../../shared/helpers/forum-tag.helpers.js';

import { createDiscussionControls } from '../components/discussion-status.component.js';
import { createDiscussionHistorySummary } from '../components/discussion-history.component.js';

import type { DiscussionData } from '../../shared/types/discussion.type.js';

export async function createDiscussionPost(
    interaction: ModalSubmitInteraction,
    data: DiscussionData,
) {
    if (!interaction.guild) {
        throw new Error('Discussions can only be created inside a server.');
    }

    const configuration = guildConfigurationRepository.findByGuildId(
        interaction.guild.id,
    );

    if (!configuration) {
        throw new Error(
            'This server has not been configured for discussion management.',
        );
    }

    const forum = await getForumChannel(
        interaction.guild,
        configuration.forumChannelId,
    );

    const appliedTags = getDiscussionTagIds(
        forum,
        data.category,
        data.level,
        DISCUSSION_STATUSES.NEW,
    );

    const createdAt = new Date();

    const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(data.title.toLocaleUpperCase())
    .setDescription(`— ${ data.context }`)
    .addFields(
        {
            name: 'Initial proposal',
            value: data.proposal,
            inline: false,
        },
        {
            name: 'Level',
            value: data.level.capitalized(),
            inline: true,
        },
        {
            name: 'Category',
            value: data.category.capitalized(),
            inline: true,
        },
        {
            name: 'Author',
            value: interaction.user.toString(),
            inline: true,
        },
    )
    .setFooter({
        text: 'Discussion Manager',
    })
    .setTimestamp(createdAt);

    const thread = await forum.threads.create({
        name: `[🔵 NEW] ${ data.title }`,
        message: {
            embeds: [embed],
        },
        appliedTags,
    });

    const starterMessage = await thread.fetchStarterMessage();

    if (!starterMessage) {
        throw new Error(
            `Could not retrieve starter message for thread "${ thread.id }".`,
        );
    }

    const controls = createDiscussionControls(
        thread.id,
        DISCUSSION_STATUSES.NEW,
    );

    if (!controls) {
        throw new Error('Could not create discussion controls.');
    }

    const controlsMessage = await thread.send({
        components: [controls],
    });

    await controlsMessage.pin();

    const historySummary = createDiscussionHistorySummary({
        title: data.title,
        status: DISCUSSION_STATUSES.NEW,
        createdBy: interaction.user.id,
        createdAt,
        history: [],
    });

    const historySummaryMessage = await thread.send({
        embeds: [historySummary],
    });

    await historySummaryMessage.pin();

    discussionRepository.create({
        threadId: thread.id,
        guildId: interaction.guild.id,
        forumChannelId: forum.id,
        archiveChannelId: configuration.archiveChannelId,
        title: data.title,
        context: data.context,
        proposal: data.proposal,
        category: data.category,
        level: data.level,
        createdBy: interaction.user.id,
        starterMessageId: starterMessage.id,
        controlsMessageId: controlsMessage.id,
        historySummaryMessageId: historySummaryMessage.id,
        status: DISCUSSION_STATUSES.NEW,
        createdAt,
    });

    await thread.setLocked(true);

    return thread;
}