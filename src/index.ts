import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events,
    MessageFlags,
    type ChatInputCommandInteraction,
    type ModalSubmitInteraction,
    type StringSelectMenuInteraction,
} from 'discord.js';

import { CommandName } from './shared/enums/command-name.enum.js';
import { SubcommandName } from './shared/enums/subcommand-name.enum.js';

// EXTENSIONS 
import './shared/extensions/extensions.module.js';

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
    isDiscussionStatus,
} from './shared/helpers/forum-tag.helpers.js';

import { createDiscussionPost } from './app/services/discussion.service.js';
import { updateDiscussionStatus } from './app/services/discussion-history.service.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error('Missing DISCORD_TOKEN in environment.');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${ readyClient.user.tag }`);
});

async function handleChatInputCommand(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    if (interaction.commandName !== CommandName.Discussion) {
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== SubcommandName.Create) {
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

async function handleStatusSelection(
    interaction: StringSelectMenuInteraction,
): Promise<void> {
    const statusPrefix = 'discussion_status:';

    if (!interaction.customId.startsWith(statusPrefix)) {
        return;
    }

    const threadId = interaction.customId.slice(statusPrefix.length);
    const selectedStatus = interaction.values[0];

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    if (!threadId || !selectedStatus || !isDiscussionStatus(selectedStatus)) {
        await interaction.editReply('Invalid discussion status selection.');
        return;
    }

    if (!interaction.guild) {
        await interaction.editReply(
            'This action must be performed inside a server.',
        );
        return;
    }

    try {
        await updateDiscussionStatus(
            interaction.guild,
            threadId,
            selectedStatus,
            interaction.user,
        );

        await interaction.editReply(
            `Discussion status updated to **${ selectedStatus }**.`,
        );
    } catch (error) {
        console.error('Status update failed:', error);

        await interaction.editReply(
            'Failed to update the discussion status.',
        );
    }
}

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleChatInputCommand(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleModalSubmission(interaction);
            return;
        }

        if (interaction.isStringSelectMenu()) {
            await handleStatusSelection(interaction);
        }
    } catch (error) {
        console.error('Unhandled interaction error:', error);
    }
});

client.login(token);