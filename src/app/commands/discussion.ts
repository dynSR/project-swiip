import {
    ChannelType,
    SlashCommandBuilder,
    SlashCommandChannelOption,
    SlashCommandRoleOption,
    SlashCommandStringOption,
} from 'discord.js';

import { CommandName } from '../../shared/enums/command-name.enum.js';
import { SubcommandName } from '../../shared/enums/subcommand-name.enum.js';

const requiredCategoryOption: SlashCommandStringOption = new SlashCommandStringOption()
.setName('category')
.setDescription('The category of the discussion')
.setRequired(true)
.addChoices(
    { name: 'Gameplay', value: 'GAMEPLAY' },
    { name: 'Art & Design', value: 'ART_AND_DESIGN' },
    { name: 'Technical', value: 'TECHNICAL' },
    { name: 'Game Design', value: 'GAME_DESIGN' },
    { name: 'Audio', value: 'AUDIO' },
    { name: 'Workflow', value: 'WORKFLOW' },
);

const requiredForumChannelOption: SlashCommandChannelOption = new SlashCommandChannelOption()
.setName('forum-channel')
.setDescription('The forum channel used to host discussions')
.addChannelTypes(ChannelType.GuildForum)
.setRequired(true);

const requiredArchiveChannelOption: SlashCommandChannelOption = new SlashCommandChannelOption()
.setName('archive-channel')
.setDescription('The text channel used to archive decisions')
.addChannelTypes(ChannelType.GuildText)
.setRequired(true);

const optionalDiscussionManagementRoleOption: SlashCommandRoleOption = new SlashCommandRoleOption()
.setName('discussion-management-role')
.setDescription('Role allowed to manage discussion lifecycles')
.setRequired(false);

const optionalArchiveManagementRoleOption: SlashCommandRoleOption = new SlashCommandRoleOption()
.setName('archive-management-role')
.setDescription('Role allowed to manage archived decisions')
.setRequired(false);

export const discussionCommand = new SlashCommandBuilder()
.setName(CommandName.Discussion)
.setDescription('Manage project discussions')
.addSubcommand(sc => sc
    .setName(SubcommandName.Create)
    .setDescription('Create a new discussion')
    .addStringOption(requiredCategoryOption),
)
.addSubcommand(sc => sc
    .setName(SubcommandName.Setup)
    .setDescription('Configure discussion channels and management roles')
    .addChannelOption(requiredForumChannelOption)
    .addChannelOption(requiredArchiveChannelOption)
    .addRoleOption(optionalDiscussionManagementRoleOption)
    .addRoleOption(optionalArchiveManagementRoleOption),
);