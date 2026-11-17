import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events,
    MessageFlags,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
    type ModalSubmitInteraction,
} from 'discord.js';
import { handleCloseDiscussion } from "./app/services/discussion-close.service.js";

import { CommandName } from './shared/enums/command-name.enum.js';
import { SubcommandName } from './shared/enums/subcommand-name.enum.js';

import { handleDiscussionButton } from './app/components/discussion-button.handler.js';
import { handleDeferDiscussion } from './app/services/discussion-defer.service.js';

import {
    getForumChannel,
    getTextChannel,
    validateChannelPermissions,
} from './shared/helpers/channel.helpers.js';
import { validateGuildRole } from './shared/helpers/role.helpers.js';

import { setupGuildConfiguration } from './app/services/guild-configuration.service.js';
import { guildConfigurationRepository } from './database/repositories/guild-configuration.repository.js';

// EXTENSIONS MODULE
import './shared/modules/extensions.module.js';

import {
    CREATE_DISCUSSION_MODAL_ID,
    CONTEXT_TEXT_INPUT_ID,
    PROPOSAL_TEXT_INPUT_ID,
    TITLE_TEXT_INPUT_ID,
    LEVEL_SELECT_ID,
    createDiscussionModal,
} from './app/components/discussion-modal.component.js';

import {
    isDiscussionCategory,
    isDiscussionLevel,
} from './shared/helpers/forum-tag.helpers.js';

import { createDiscussionPost } from './app/services/discussion.service.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error('Missing DISCORD_TOKEN in environment.');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// DEBUG — Rest API calls
client.rest.on('restDebug', (message) => {
    console.log('[Discord REST]', message);
});

client.rest.on('rateLimited', (info) => {
    console.warn('[Discord REST] Rate limited:', info);
});

client.once(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${ readyClient.user.tag }`);
});

async function handleSetupCommand(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            content: 'This command must be used inside a server.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: 'Only server administrators can configure discussions.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    try {
        const forumChannelId = interaction.options.getChannel(
            'forum-channel',
            true,
        ).id;

        const archiveChannelId = interaction.options.getChannel(
            'archive-channel',
            true,
        ).id;

        const discussionManagementRole = interaction.options.getRole(
            'discussion-management-role',
        );

        const archiveManagementRole = interaction.options.getRole(
            'archive-management-role',
        );

        validateGuildRole(
            interaction.guild,
            discussionManagementRole,
        );

        validateGuildRole(
            interaction.guild,
            archiveManagementRole,
        );

        const forumChannel = await getForumChannel(
            interaction.guild,
            forumChannelId,
        );

        const archiveChannel = await getTextChannel(
            interaction.guild,
            archiveChannelId,
        );

        validateChannelPermissions(
            interaction.guild,
            forumChannel,
            archiveChannel,
        );

        const configuration = setupGuildConfiguration({
            guild: interaction.guild,
            forumChannelId: forumChannel.id,
            archiveChannelId: archiveChannel.id,
            discussionManagementRoleId: discussionManagementRole?.id ?? null,
            archiveManagementRoleId: archiveManagementRole?.id ?? null,
        });

        await interaction.editReply({
            content: [
                '### Server configuration saved successfully!',
                '',
                `**Forum Channel:** <#${ configuration.forumChannelId }>`,
                `**Archive Channel:** <#${ configuration.archiveChannelId }>`,
                `**Discussion Management Roles:** ${ configuration.discussionManagementRoleIds.length > 0
                    ? configuration.discussionManagementRoleIds.map(id => `<@&${ id }>`).join(', ')
                    : 'None' }`,
                `**Archive Management Roles:** ${ configuration.archiveManagementRoleIds.length > 0
                    ? configuration.archiveManagementRoleIds.map(id => `<@&${ id }>`).join(', ')
                    : 'None' }`,
            ].join('\n'),
        });
    } catch (error) {
        console.error('Discussion setup validation failed:', error);

        await interaction.editReply({
            content: error instanceof Error
                ? `Setup validation failed: ${ error.message }`
                : 'Setup validation failed due to an unexpected error.',
        });
    }
}

async function handleChatInputCommand(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (interaction.commandName !== CommandName.Discussion) {
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === SubcommandName.Setup) {
        await handleSetupCommand(interaction);
        return;
    }

    if (subcommand !== SubcommandName.Create) {
        return;
    }

    if (!interaction.guild) {
        await interaction.reply({
            content: 'Discussions can only be created inside a server.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    const configuration = guildConfigurationRepository.findByGuildId(
        interaction.guild.id,
    );

    if (!configuration) {
        const isAdmin = interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator,
        );

        await interaction.reply({
            content: isAdmin
                ? 'This server has not been configured yet. Run `/discussion setup` before creating discussions.'
                : 'This server has not been configured yet. Please ask a server administrator to run `/discussion setup`.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    const category = interaction.options.getString('category', true);

    if (!isDiscussionCategory(category)) {
        await interaction.reply({
            content: 'Invalid discussion category.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    await interaction.showModal(
        createDiscussionModal(category),
    );
}

async function handleModalSubmission(
    interaction: ModalSubmitInteraction,
): Promise<void> {
    const modalPrefix = `${ CREATE_DISCUSSION_MODAL_ID }:`;

    if (!interaction.customId.startsWith(modalPrefix)) {
        return;
    }

    const category = interaction.customId.slice(modalPrefix.length);

    if (!isDiscussionCategory(category)) {
        await interaction.reply({
            content: 'Invalid discussion category.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    const title: string = interaction.fields.getTextInputValue(
        TITLE_TEXT_INPUT_ID,
    );

    const context: string = interaction.fields.getTextInputValue(
        CONTEXT_TEXT_INPUT_ID,
    );

    const proposal: string = interaction.fields.getTextInputValue(
        PROPOSAL_TEXT_INPUT_ID,
    );

    const level: string = interaction.fields.getStringSelectValues(
        LEVEL_SELECT_ID,
    )[0];

    if (!level || !isDiscussionLevel(level)) {
        await interaction.reply({
            content: 'Invalid documentation level.',
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    try {
        const thread = await createDiscussionPost(
            interaction,
            {
                title,
                category,
                context,
                proposal,
                level
            },
        );

        await interaction.editReply({
            content: [
                '### Discussion successfully created!',
                '',
                `**Title:** ${ title }`,
                `**Category:** ${ category }`,
                `**Documentation:** ${ level }`,
                '',
                `Your discussion is now available in ${ thread.toString() }.`,
            ].join('\n'),
        });
    } catch (error) {
        console.error('Discussion creation failed:', error);

        await interaction.editReply({
            content: 'Failed to create the discussion. Check the bot logs for details.',
        });
    }
}

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleChatInputCommand(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('discussion_defer_modal:')) {
                await handleDeferDiscussion(interaction);
            } else if (interaction.customId.startsWith('discussion_close_modal:')) {
                await handleCloseDiscussion(interaction);
            } else {
                await handleModalSubmission(interaction);
            }

            return;
        }

        if (interaction.isButton()) {
            await handleDiscussionButton(interaction);
            return;
        }
    } catch (error) {
        console.error('Unhandled interaction error:', error);
    }
});

client.login(token);