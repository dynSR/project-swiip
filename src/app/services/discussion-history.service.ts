import {
    EmbedBuilder,
    type Guild,
    type User,
} from 'discord.js';

import {
    DISCUSSION_STATUSES,
} from '../../shared/constants/discussion.constants.js';

import {
    getForumChannel,
    getThreadChannel,
} from '../../shared/helpers/channel.helpers.js';

import {
    getDiscussionStatusTagId,
    isDiscussionStatus,
} from '../../shared/helpers/forum-tag.helpers.js';

import {
    AppError,
    ERROR_CODES,
} from '../../shared/errors/app.error.js';

import type {
    DiscussionStatus,
} from '../../shared/types/discussion.types.js';

export async function updateDiscussionStatus(
    guild: Guild,
    threadId: string,
    newStatus: DiscussionStatus,
    changedBy: User,
): Promise<void> {
    const thread = await getThreadChannel(guild, threadId);

    if (!thread.parentId) {
        throw new AppError(
            ERROR_CODES.THREAD_NOT_FOUND,
            `Thread "${ threadId }" has no parent channel.`,
        );
    }

    const forum = await getForumChannel(guild, thread.parentId);

    const currentStatusTag = forum.availableTags.find(tag =>
        thread.appliedTags.includes(tag.id) &&
        isDiscussionStatus(tag.name),
    );

    const previousStatus = currentStatusTag?.name;

    if (previousStatus === newStatus) {
        return;
    }

    const newStatusTagId = getDiscussionStatusTagId(
        forum,
        newStatus,
    );

    const retainedTags = thread.appliedTags.filter(tagId =>
        tagId !== currentStatusTag?.id,
    );

    await thread.setAppliedTags([
        ...retainedTags,
        newStatusTagId,
    ]);

    const historyEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Status updated')
    .addFields(
        {
            name: 'Previous status',
            value: previousStatus ?? 'UNKNOWN',
            inline: true,
        },
        {
            name: 'New status',
            value: newStatus,
            inline: true,
        },
        {
            name: 'Changed by',
            value: changedBy.toString(),
            inline: true,
        },
    )
    .setTimestamp();

    await thread.send({
        embeds: [historyEmbed],
    });
}