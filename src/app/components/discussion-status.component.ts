import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import {
    DISCUSSION_STATUSES,
} from '../../shared/constants/discussion.constants.js';

import type {
    DiscussionStatus,
} from '../../shared/types/discussion.type.js';

export function createDiscussionControls(
    threadId: string,
    status: DiscussionStatus,
) {
    const buttons: ButtonBuilder[] = [];

    switch (status) {
        case DISCUSSION_STATUSES.NEW:
            buttons.push(
                new ButtonBuilder()
                .setCustomId(`discussion:start:${threadId}`)
                .setLabel('Start discussion')
                .setStyle(ButtonStyle.Success),
            );
            break;

        case DISCUSSION_STATUSES.OPEN:
            buttons.push(
                new ButtonBuilder()
                .setCustomId(`discussion:defer:${threadId}`)
                .setLabel('Defer discussion')
                .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                .setCustomId(`discussion:close:${threadId}`)
                .setLabel('Close discussion')
                .setStyle(ButtonStyle.Danger),
            );
            break;

        case DISCUSSION_STATUSES.DEFERRED:
            buttons.push(
                new ButtonBuilder()
                .setCustomId(`discussion:resume:${threadId}`)
                .setLabel('Resume discussion')
                .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                .setCustomId(`discussion:close:${threadId}`)
                .setLabel('Close discussion')
                .setStyle(ButtonStyle.Danger),
            );
            break;

        case DISCUSSION_STATUSES.CLOSED:
            break;
    }

    if (buttons.length === 0) {
        return null;
    }

    return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(buttons);
}