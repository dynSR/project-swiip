import {
    EmbedBuilder,
    ModalSubmitInteraction
} from 'discord.js';
import { getRequiredEnv } from "../../config/env.js";
import { DISCUSSION_STATUSES } from "../../shared/constants/discussion.constants.js";

import { getForumChannel } from '../../shared/helpers/channel.helpers.js';
import { getDiscussionTagIds } from '../../shared/helpers/forum-tag.helpers.js';

import type { DiscussionData } from '../../shared/types/discussion.types.js';
import { createStatusSelector } from "../components/discussion-status.component.js";

export async function createDiscussionPost(
    interaction: ModalSubmitInteraction,
    data: DiscussionData
) {
    if (!interaction.guild) {
        throw new Error('Discussions can only be created inside a server.');
    }

    const forumChannelId = getRequiredEnv('FORUM_CHANNEL_ID');

    const forum = await getForumChannel(
        interaction.guild,
        forumChannelId,
    );

    const appliedTags = getDiscussionTagIds(
        forum,
        data.category,
        data.level,
        DISCUSSION_STATUSES.NEW,
    );

    const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(data.title.toLocaleUpperCase())
    .setDescription(`— ${ data.context }`)
    .addFields(
        {
            name: 'Level',
            value: data.level.capitalized(),
            inline: true
        },
        {
            name: 'Category',
            value: data.category.capitalized(),
            inline: true
        },
        {
            name: 'Author',
            value: interaction.user.toString(),
            inline: true
        }
    )
    .setFooter({
        text: 'Discussion Manager'
    })
    .setTimestamp();

    // Create Forum Post
    const thread = await forum.threads.create(
        {
            name: data.title,
            message: {
                embeds: [embed]
            },
            appliedTags
        }
    );

    const starterMessage = await thread.fetchStarterMessage();

    if (!starterMessage) {
        throw new Error(
            `Could not retrieve starter message for thread "${ thread.id }".`,
        );
    }

    await starterMessage.edit({
        components: [
            createStatusSelector(thread.id),
        ],
    });

    return thread;
}