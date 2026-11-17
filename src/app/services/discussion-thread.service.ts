import type { Guild } from 'discord.js';

import { DISCUSSION_STATUSES } from '../../shared/constants/discussion.constants.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import {
    getForumChannel,
    getThreadChannel,
} from '../../shared/helpers/channel.helpers.js';

import { getDiscussionTagIds } from '../../shared/helpers/forum-tag.helpers.js';

import {
    AppError,
    ERROR_CODES
} from '../../shared/errors/app.error.js';

import type { DiscussionStatus } from '../../shared/types/discussion.type.js';

const STATUS_EMOJIS: Record<DiscussionStatus, string> = {
    NEW: '🔵',
    OPEN: '🟢',
    DEFERRED: '🟠',
    CLOSED: '🔴',
};

export async function synchronizeDiscussionThread(
    guild: Guild,
    threadId: string,
) {
    console.log('[Thread Sync] Fetching discussion...');

    const discussion = discussionRepository.findByThreadId(threadId);
    if (!discussion) {
        throw new AppError(
            ERROR_CODES.THREAD_NOT_FOUND,
            `Discussion "${ threadId }" was not found in the database.`,
        );
    }

    const status = discussion.status;
    const isOpen = status === DISCUSSION_STATUSES.OPEN;
    const isArchived = status === DISCUSSION_STATUSES.DEFERRED
        || status === DISCUSSION_STATUSES.CLOSED;

    console.log('[Thread Sync] Fetching Discord thread...');

    const thread = await getThreadChannel(guild, threadId);

    console.log('[Thread Sync] Current thread state:', {
        // name: thread.name,
        archived: thread.archived,
        locked: thread.locked,
        status,
    });

    console.log('[Thread Sync] Fetching Forum channel...');

    const forum = await getForumChannel(
        guild,
        discussion.forumChannelId,
    );

    const appliedTags = getDiscussionTagIds(
        forum,
        discussion.category,
        discussion.level,
        status,
    );

    console.log('[Thread Sync] Sending thread edit request...', {
        threadId: thread.id,
        name: `[${ STATUS_EMOJIS[status] } ${ status }] ${ discussion.title }`,
        appliedTags,
        archived: isArchived,
        locked: !isOpen,
    });

    await thread.edit({
        name: `[${ STATUS_EMOJIS[status] } ${ status }] ${ discussion.title }`,
        appliedTags,
        archived: isArchived,
        locked: !isOpen,
    });

    console.log('[Thread Sync] Completed.');

    return thread;
}