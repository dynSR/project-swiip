import type { Guild } from 'discord.js';

import { guildConfigurationRepository } from '../../database/repositories/guild-configuration.repository.js';

export interface SetupGuildConfigurationInput {
    guild: Guild;
    forumChannelId: string;
    archiveChannelId: string;
    discussionManagementRoleId: string | null;
    archiveManagementRoleId: string | null;
}

export function createGuildConfigurationService(repository = guildConfigurationRepository) {
    return {
        setupGuildConfiguration(input: SetupGuildConfigurationInput) {
            const configuration = {
                forumChannelId: input.forumChannelId,
                archiveChannelId: input.archiveChannelId,
                discussionManagementRoleIds: input.discussionManagementRoleId
                    ? [input.discussionManagementRoleId]
                    : [],
                archiveManagementRoleIds: input.archiveManagementRoleId
                    ? [input.archiveManagementRoleId]
                    : [],
            };

            const existingConfiguration = repository.findByGuildId(input.guild.id);

            if (existingConfiguration) {
                return repository.replace(input.guild.id, configuration);
            }

            return repository.create({
                guildId: input.guild.id,
                ...configuration,
            });
        },
    };
}

export const { setupGuildConfiguration } = createGuildConfigurationService();