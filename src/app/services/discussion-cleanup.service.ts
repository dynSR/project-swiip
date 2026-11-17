import type { Guild } from 'discord.js';

import { decisionRecordRepository } from '../../database/repositories/decision-record.repository.js';
import { discussionRepository } from '../../database/repositories/discussion.repository.js';

export function createDiscussionCleanupService(
    decisionRecordRepo = decisionRecordRepository,
    discussionRepo = discussionRepository,
) {
    return {
        async cleanupArchivedDiscussion(
            guild: Guild,
            threadId: string,
        ): Promise<void> {
            const discussion = discussionRepo.findByThreadId(threadId);

            if (!discussion) {
                throw new Error(`Discussion "${threadId}" was not found.`);
            }

            if (discussion.guildId !== guild.id) {
                throw new Error('The discussion belongs to another server.');
            }

            const record = decisionRecordRepo.findByDiscussionThreadId(
                threadId,
            );

            if (!record || !record.archiveMessageId) {
                throw new Error(
                    'Cannot delete a discussion without a successfully published archive.',
                );
            }

            const thread = await guild.channels.fetch(threadId);

            if (thread) {
                if (!thread.isThread()) {
                    throw new Error(
                        `Channel "${threadId}" is not a discussion thread.`,
                    );
                }

                await thread.delete('Discussion successfully archived.');
            }

            const deletedDiscussion = discussionRepo.deleteByThreadId(
                threadId,
            );

            if (!deletedDiscussion) {
                throw new Error(
                    `Failed to delete discussion "${threadId}" from the database.`,
                );
            }
        },
    };
}

export const {
    cleanupArchivedDiscussion,
} = createDiscussionCleanupService();