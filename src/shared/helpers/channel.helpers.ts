import {
    ChannelType,
    type ForumChannel,
    type Guild,
    type ThreadChannel,
} from 'discord.js';

import {
    AppError,
    ERROR_CODES
} from '../errors/app.error.js';

export async function getForumChannel(
    guild: Guild,
    channelId: string,
): Promise<ForumChannel> {
    const channel = await guild.channels.fetch(channelId);

    if (!channel) {
        throw new AppError(
            ERROR_CODES.CHANNEL_NOT_FOUND,
            `Channel "${ channelId }" was not found.`,
        );
    }

    if (channel.type !== ChannelType.GuildForum) {
        throw new AppError(
            ERROR_CODES.CHANNEL_NOT_FORUM,
            `Channel "${ channel.name }" is not a Forum Channel.`,
        );
    }

    return channel;
}

export async function getThreadChannel(
    guild: Guild,
    threadId: string,
): Promise<ThreadChannel> {
    const channel = await guild.channels.fetch(threadId);

    if (!channel || !channel.isThread()) {
        throw new AppError(
            ERROR_CODES.THREAD_NOT_FOUND,
            `Thread "${ threadId }" was not found.`,
        );
    }

    return channel;
}