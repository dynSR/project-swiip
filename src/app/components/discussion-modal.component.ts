import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import {
    DECISION_OUTCOMES,
    DISCUSSION_LEVELS,
} from '../../shared/constants/discussion.constants.js';

import type {
    DiscussionCategory,
    DiscussionLevel,
} from '../../shared/types/discussion.type.js';

export const CREATE_DISCUSSION_MODAL_ID = 'discussion_create_modal';

export const TITLE_TEXT_INPUT_ID = 'discussion_title';
export const CONTEXT_TEXT_INPUT_ID = 'discussion_context';
export const PROPOSAL_TEXT_INPUT_ID = 'discussion_proposal';
export const LEVEL_SELECT_ID = 'discussion_level';

export const DEFER_DISCUSSION_MODAL_ID = 'discussion_defer_modal';
export const DEFER_REASON_INPUT_ID = 'discussion_defer_reason';

export const CLOSE_DISCUSSION_MODAL_ID = 'discussion_close_modal';
export const CLOSE_DECISION_INPUT_ID = 'discussion_close_decision';
export const CLOSE_SUMMARY_INPUT_ID = 'discussion_close_summary';
export const CLOSE_NOTES_INPUT_ID = 'discussion_close_notes';

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

export function createDeferDiscussionModal(
    threadId: string,
): ModalBuilder {
    const modal = new ModalBuilder()
    .setCustomId(`${ DEFER_DISCUSSION_MODAL_ID }:${ threadId }`)
    .setTitle('Defer discussion');

    const reasonInput = new TextInputBuilder()
    .setCustomId(DEFER_REASON_INPUT_ID)
    .setPlaceholder('Why is this discussion being deferred?')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(1000)
    .setRequired(true);

    const reasonLabel = new LabelBuilder()
    .setLabel('Reason for deferral')
    .setDescription('Explain why the discussion cannot continue for now.')
    .setTextInputComponent(reasonInput);

    modal.addLabelComponents(reasonLabel);

    return modal;
}

export function createCloseDiscussionModal(threadId: string): ModalBuilder {
    const modal = new ModalBuilder()
    .setCustomId(`${ CLOSE_DISCUSSION_MODAL_ID }:${ threadId }`)
    .setTitle('Close discussion');

    const decisionSelection = new StringSelectMenuBuilder()
    .setCustomId(CLOSE_DECISION_INPUT_ID)
    .setOptions(
        Object.values(DECISION_OUTCOMES).map(value => ({
            label: value,
            value
        })))
    .setRequired(true);

    const decisionLabel = new LabelBuilder()
    .setLabel('Final decision')
    .setDescription('Represents the final decision took by the team for this topic.')
    .setStringSelectMenuComponent(decisionSelection);

    const summaryInput = new TextInputBuilder()
    .setCustomId(CLOSE_SUMMARY_INPUT_ID)
    .setPlaceholder('Summarize the final outcome of this discussion.')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(4000)
    .setRequired(true);

    const summaryLabel = new LabelBuilder()
    .setLabel('Final summary')
    .setDescription('Explain the outcome and its reasoning.')
    .setTextInputComponent(summaryInput);

    const notesInput = new TextInputBuilder()
    .setCustomId(CLOSE_NOTES_INPUT_ID)
    .setPlaceholder('Additional information (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

    const notesLabel = new LabelBuilder()
    .setLabel('Additional notes (optional)')
    .setDescription('Optional supplementary information.')
    .setTextInputComponent(notesInput);

    modal.addLabelComponents(
        decisionLabel,
        summaryLabel,
        notesLabel,
    );

    return modal;
}