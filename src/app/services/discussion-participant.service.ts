import type { Guild } from 'discord.js';

import { getThreadChannel } from '../../shared/helpers/channel.helpers.js';

export function createDiscussionParticipantService(
    getThreadChannelDependency: typeof getThreadChannel = getThreadChannel,
) {
    return {
        async getDiscussionParticipants(guild: Guild, threadId: string) {
            const thread = await getThreadChannelDependency(guild, threadId);

            const participants = new Map<string, {
                userId: string;
                displayName: string;
            }>();

            let before: string | undefined;

            while (true) {
                const messages = await thread.messages.fetch({
                    limit: 100,
                    ...(before ? { before } : {}),
                });

                for (const message of messages.values()) {
                    if (message.author.bot || message.webhookId) continue;

                    if (!participants.has(message.author.id)) {
                        participants.set(message.author.id, {
                            userId: message.author.id,
                            displayName:
                                message.member?.displayName ??
                                message.author.globalName ??
                                message.author.username,
                        });
                    }
                }

                if (messages.size < 100) break;

                const oldestMessage = messages.last();

                if (!oldestMessage || oldestMessage.id === before) break;

                before = oldestMessage.id;
            }

            return [...participants.values()];
        },
    };
}

export const { getDiscussionParticipants } = createDiscussionParticipantService();