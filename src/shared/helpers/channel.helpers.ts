import {
    ChannelType,
    PermissionFlagsBits,
    type ForumChannel,
    type Guild,
    type TextChannel,
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

export async function getTextChannel(
    guild: Guild,
    channelId: string,
): Promise<TextChannel> {
    const channel = await guild.channels.fetch(channelId);

    if (!channel) {
        throw new AppError(
            ERROR_CODES.CHANNEL_NOT_FOUND,
            `Channel "${ channelId }" was not found.`,
        );
    }

    if (channel.type !== ChannelType.GuildText) {
        throw new AppError(
            ERROR_CODES.CHANNEL_NOT_TEXT,
            `Channel "${ channel.name }" is not a standard text channel.`,
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

export function validateChannelPermissions(
    guild: Guild,
    forumChannel: ForumChannel,
    archiveChannel: TextChannel,
): void {
    const botMember = guild.members.me;

    if (!botMember) {
        throw new AppError(
            ERROR_CODES.BOT_MEMBER_NOT_FOUND,
            'Unable to retrieve the bot member from this server.',
        );
    }

    const forumPermissions = forumChannel.permissionsFor(botMember);

    const requiredForumPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.SendMessagesInThreads,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageThreads,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
    ];

    if (!forumPermissions.has(requiredForumPermissions)) {
        throw new AppError(
            ERROR_CODES.MISSING_CHANNEL_PERMISSIONS,
            'The bot is missing required permissions in the Forum Channel.',
        );
    }

    const archivePermissions = archiveChannel.permissionsFor(botMember);

    const requiredArchivePermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
    ];

    if (!archivePermissions.has(requiredArchivePermissions)) {
        throw new AppError(
            ERROR_CODES.MISSING_CHANNEL_PERMISSIONS,
            'The bot is missing required permissions in the Archive Channel.',
        );
    }
}