import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { DiscussionStatus } from "../../shared/enums/discussion-status.enum.js";

export function createStatusSelector(threadId: string) {
    const selector = new StringSelectMenuBuilder()
    .setCustomId(`discussion_status:${ threadId }`)
    .setPlaceholder('Change discussion status')
    .addOptions(
        new StringSelectMenuOptionBuilder()
        .setLabel(DiscussionStatus.OPEN)
        .setValue(DiscussionStatus.OPEN.toLocaleUpperCase())
        .setDescription('Discussion is in progress.'),
        new StringSelectMenuOptionBuilder()
        .setLabel(DiscussionStatus.DEFERRED)
        .setValue(DiscussionStatus.DEFERRED.toLocaleUpperCase())
        .setDescription('Discussion is postponed.'),
        new StringSelectMenuOptionBuilder()
        .setLabel(DiscussionStatus.CLOSED)
        .setValue(DiscussionStatus.CLOSED.toLocaleUpperCase())
        .setDescription('Discussion is finished.')
    );

    return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selector);
}