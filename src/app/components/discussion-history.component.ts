import { EmbedBuilder } from 'discord.js';

import type { DiscussionStatus } from '../../shared/types/discussion.type.js';

interface DiscussionHistoryEntry {
    previousStatus: DiscussionStatus;
    newStatus: DiscussionStatus;
    performedBy: string;
    reason: string;
    createdAt: Date;
}

interface DiscussionHistorySummaryInput {
    title: string;
    status: DiscussionStatus;
    createdBy: string;
    createdAt: Date;
    history: DiscussionHistoryEntry[];
}

const STATUS_EMOJIS: Record<DiscussionStatus, string> = {
    NEW: '🔵',
    OPEN: '🟢',
    DEFERRED: '🟠',
    CLOSED: '🔴',
};

export function createDiscussionHistorySummary(
    input: DiscussionHistorySummaryInput,
) {
    const historyDescription = input.history.length
        ? input.history.map((entry) => {
            const timestamp = Math.floor(entry.createdAt.getTime() / 1000);

            return [
                `**${STATUS_EMOJIS[entry.previousStatus]} ${entry.previousStatus} → ${STATUS_EMOJIS[entry.newStatus]} ${entry.newStatus}**`,
                `By <@${entry.performedBy}> · <t:${timestamp}:f>`,
                `Reason: ${entry.reason}`,
            ].join('\n');
        }).join('\n\n')
        : 'No status changes recorded yet.';

    return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Discussion History')
    .setDescription(`History of **${input.title}**.`)
    .addFields(
        {
            name: 'Current status',
            value: `${STATUS_EMOJIS[input.status]} ${input.status}`,
            inline: true,
        },
        {
            name: 'Created by',
            value: `<@${input.createdBy}>`,
            inline: true,
        },
        {
            name: 'Created at',
            value: `<t:${Math.floor(input.createdAt.getTime() / 1000)}:F>`,
            inline: false,
        },
        {
            name: 'Status transitions',
            value: historyDescription,
            inline: false,
        },
    )
    .setFooter({ text: 'Discussion Manager' })
    .setTimestamp(input.createdAt);
}