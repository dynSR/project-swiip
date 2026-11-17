import type { Guild } from 'discord.js';

import { discussionRepository } from '../../database/repositories/discussion.repository.js';
import { discussionHistoryRepository } from '../../database/repositories/discussion-history.repository.js';

import { getThreadChannel } from '../../shared/helpers/channel.helpers.js';

import { createDiscussionHistorySummary } from '../components/discussion-history.component.js';

import {
    AppError,
    ERROR_CODES
} from '../../shared/errors/app.error.js';

export async function synchronizeDiscussionHistory(
    guild: Guild,
    threadId: string,
) {
    const discussion = discussionRepository.findByThreadId(threadId);

    if (!discussion) {
        throw new AppError(
            ERROR_CODES.THREAD_NOT_FOUND,
            `Discussion "${ threadId }" was not found in the database.`,
        );
    }

    const history = discussionHistoryRepository.findByDiscussionThreadId(
        threadId,
    );

    const thread = await getThreadChannel(guild, threadId);

    const historySummary = createDiscussionHistorySummary({
        title: discussion.title,
        status: discussion.status,
        createdBy: discussion.createdBy,
        createdAt: discussion.createdAt,
        history,
    });

    const historyMessage = await thread.messages.fetch(
        discussion.historySummaryMessageId,
    );

    await historyMessage.edit({
        embeds: [historySummary],
    });

    return historyMessage;
}