import {
    PermissionFlagsBits,
    type Guild,
} from 'discord.js';

import { guildConfigurationRepository } from '../../database/repositories/guild-configuration.repository.js';

export async function canManageDiscussion(
    guild: Guild,
    userId: string,
    discussionCreatorId: string,
): Promise<boolean> {
    const member = await guild.members.fetch(userId);

    // Server administrators always have management access.
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    // Discussion creators can manage their own discussions.
    if (userId === discussionCreatorId) {
        return true;
    }

    const configuration = guildConfigurationRepository.findByGuildId(
        guild.id,
    );

    if (!configuration) {
        return false;
    }

    // Check whether the member has at least one configured management role.
    return configuration.discussionManagementRoleIds.some(roleId =>
        member.roles.cache.has(roleId),
    );
}