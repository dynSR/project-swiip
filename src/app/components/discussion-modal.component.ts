import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import {
    DISCUSSION_LEVELS,
} from '../../shared/constants/discussion.constants.js';

import type {
    DiscussionCategory,
    DiscussionLevel,
} from '../../shared/types/discussion.types.js';

export const CREATE_DISCUSSION_MODAL_ID = 'discussion_create_modal';

export const TITLE_TEXT_INPUT_ID = 'discussion_title';
export const CONTEXT_TEXT_INPUT_ID = 'discussion_context';
export const PROPOSAL_TEXT_INPUT_ID = 'discussion_proposal';
export const LEVEL_SELECT_ID = 'discussion_level';

export function createDiscussionModal(
    category: DiscussionCategory,
): ModalBuilder {
    const modal = new ModalBuilder()
    .setCustomId(`${ CREATE_DISCUSSION_MODAL_ID }:${ category }`)
    .setTitle(`New discussion — ${ category }`);

    // Documentation level
    const levelSelect = new StringSelectMenuBuilder()
    .setCustomId(LEVEL_SELECT_ID)
    .setPlaceholder('Choose a documentation level')
    .setRequired(true)
    .addOptions(
        new StringSelectMenuOptionBuilder()
        .setLabel('Quick')
        .setValue(DISCUSSION_LEVELS.QUICK)
        .setDescription('For simple ideas and minor improvements.')
        .setDefault(true),

        new StringSelectMenuOptionBuilder()
        .setLabel('Structured')
        .setValue(DISCUSSION_LEVELS.STRUCTURED)
        .setDescription('For topics requiring discussion and evaluation.'),

        new StringSelectMenuOptionBuilder()
        .setLabel('Decision')
        .setValue(DISCUSSION_LEVELS.DECISION)
        .setDescription('For significant decisions with lasting implications.'),
    );

    const levelLabel = new LabelBuilder()
    .setLabel('Documentation level')
    .setStringSelectMenuComponent(levelSelect);

    // Title
    const titleInput = new TextInputBuilder()
    .setCustomId(TITLE_TEXT_INPUT_ID)
    .setPlaceholder('What we will discuss')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

    const titleLabel = new LabelBuilder()
    .setLabel('The topic')
    .setTextInputComponent(titleInput);

    // Context
    const contextInput = new TextInputBuilder()
    .setCustomId(CONTEXT_TEXT_INPUT_ID)
    .setPlaceholder('What led us to discuss this topic?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

    const contextLabel = new LabelBuilder()
    .setLabel('Context')
    .setTextInputComponent(contextInput);

    // Initial proposal
    const proposalInput = new TextInputBuilder()
    .setCustomId(PROPOSAL_TEXT_INPUT_ID)
    .setPlaceholder('What are your initial thoughts?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

    const proposalLabel = new LabelBuilder()
    .setLabel('Initial Proposal')
    .setTextInputComponent(proposalInput);


    modal.addLabelComponents(
        levelLabel,
        titleLabel,
        contextLabel,
        proposalLabel,
    );

    return modal;
}