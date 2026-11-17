import { eq } from 'drizzle-orm';
import { db } from '../../database/database.js';

import { discussions } from '../../database/schema/discussions.schema.js';
import { discussionHistories } from '../../database/schema/discussion-histories.schema.js';

import type { Guild } from 'discord.js';

import { getThreadChannel } from '../../shared/helpers/channel.helpers.js';

import { synchronizeDiscussionHistory } from './discussion-history.service.js';
import { synchronizeDiscussionThread } from './discussion-thread.service.js';

import { canTransitionDiscussionStatus } from '../../shared/helpers/discussion-status.helpers.js';

import { synchronizeDiscussionControls } from './discussion-controls.service.js';

import {
    AppError,
    ERROR_CODES
} from '../../shared/errors/app.error.js';

import type { DiscussionStatus } from '../../shared/types/discussion.type.js';

interface TransitionDiscussionInput {
    threadId: string;
    newStatus: DiscussionStatus;
    performedBy: string;
    reason: string;
}

export function createDiscussionLifecycleService(database = db) {
    return {
        transitionDiscussionStatus(input: TransitionDiscussionInput) {
            return database.transaction((tx) => {
                const discussion = tx
                .select()
                .from(discussions)
                .where(eq(discussions.threadId, input.threadId))
                .get();

                if (!discussion) {
                    throw new AppError(
                        ERROR_CODES.THREAD_NOT_FOUND,
                        `Discussion "${ input.threadId }" was not found.`,
                    );
                }

                if (!canTransitionDiscussionStatus(discussion.status, input.newStatus)) {
                    throw new AppError(
                        ERROR_CODES.INVALID_STATUS_TRANSITION,
                        `Cannot transition a discussion from ${ discussion.status } to ${ input.newStatus }.`,
                    );
                }

                const now = new Date();

                tx.update(discussions)
                .set({
                    status: input.newStatus,
                    updatedAt: now,
                })
                .where(eq(discussions.threadId, input.threadId))
                .run();

                const history = tx
                .insert(discussionHistories)
                .values({
                    discussionThreadId: input.threadId,
                    previousStatus: discussion.status,
                    newStatus: input.newStatus,
                    performedBy: input.performedBy,
                    reason: input.reason,
                    createdAt: now,
                })
                .returning()
                .get();

                return {
                    discussion: {
                        ...discussion,
                        status: input.newStatus,
                        updatedAt: now,
                    },
                    history,
                };
            });
        },
    };
}

export const {
    transitionDiscussionStatus,
} = createDiscussionLifecycleService();

export async function transitionAndSynchronizeDiscussion(
    guild: Guild,
    input: TransitionDiscussionInput,
) {
    const result = transitionDiscussionStatus(input);

    if (input.newStatus === 'OPEN') {
        await synchronizeDiscussionThread(guild, input.threadId);

        await synchronizeDiscussionHistory(guild, input.threadId);
        await synchronizeDiscussionControls(guild, input.threadId);
    } else {
        await synchronizeDiscussionHistory(guild, input.threadId);
        await synchronizeDiscussionControls(guild, input.threadId);

        await synchronizeDiscussionThread(guild, input.threadId);
    }

    return result;
}
