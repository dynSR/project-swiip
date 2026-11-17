import type { Guild } from 'discord.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';

import { getThreadChannel } from '../../shared/helpers/channel.helpers.js';

import { createDiscussionControls } from '../components/discussion-status.component.js';

import { AppError, ERROR_CODES } from '../../shared/errors/app.error.js';

export async function synchronizeDiscussionControls(
    guild: Guild,
    threadId: string,
) {
    const discussion = discussionRepository.findByThreadId(threadId);

    if (!discussion) {
        throw new AppError(
            ERROR_CODES.THREAD_NOT_FOUND,
            `Discussion "${threadId}" was not found in the database.`,
        );
    }

    const thread = await getThreadChannel(guild, threadId);

    const controlsMessage = await thread.messages.fetch(
        discussion.controlsMessageId,
    );

    const controls = createDiscussionControls(
        threadId,
        discussion.status,
    );

    await controlsMessage.edit({
        components: controls ? [controls] : [],
    });

    return controlsMessage;
}