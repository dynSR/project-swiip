import {
    SlashCommandBuilder,
    SlashCommandStringOption
} from "discord.js";
import { CommandName } from "../../shared/enums/command-name.enum.js";
import { SubcommandName } from "../../shared/enums/subcommand-name.enum.js";

const requiredCategoryOption: SlashCommandStringOption = new SlashCommandStringOption()
    .setName( 'category' )
    .setDescription( 'The category of the discussion' )
    .setRequired( true )
    .addChoices(
        { name: 'Gameplay', value: 'GAMEPLAY' },
        { name: 'Art & Design', value: 'ART_AND_DESIGN' },
        { name: 'Technical', value: 'TECHNICAL' },
        { name: 'Game Design', value: 'GAME_DESIGN' },
        { name: 'Audio', value: 'AUDIO' },
        { name: 'Workflow', value: 'WORKFLOW' }
    );

export const discussionCommand = new SlashCommandBuilder()
    .setName( CommandName.Discussion )
    .setDescription( 'Manage project discussions' )
    .addSubcommand( sc => sc.setName( SubcommandName.Create )
        .setDescription( 'Create a new discussion' )
        .addStringOption( requiredCategoryOption )
    );