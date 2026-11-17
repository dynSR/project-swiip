import type { decisionRecords } from '../../database/schema/decision-records.schema.js';
import type { discussionHistories } from '../../database/schema/discussion-histories.schema.js';

import {
    EmbedBuilder,
    type ColorResolvable,
} from 'discord.js';
import { truncateText } from "../../shared/helpers/text.helpers.js";

export type DecisionRecordArchive = typeof decisionRecords.$inferSelect;
export type DecisionRecordArchiveHistory = typeof discussionHistories.$inferSelect;

export interface DecisionRecordArchiveParticipant {
    userId: string;
    displayName: string;
}

export interface DecisionRecordArchiveData {
    record: DecisionRecordArchive;
    participants: DecisionRecordArchiveParticipant[];
    history: DecisionRecordArchiveHistory[];
    closedBy: string;
    closedAt: Date;
}

const DECISION_LABELS = {
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CONSIDERED: 'Considered',
} as const;

const DECISION_COLORS: Record<DecisionRecordArchive['decision'], ColorResolvable> = {
    APPROVED: 0x57F287,
    REJECTED: 0xED4245,
    CONSIDERED: 0xFEE75C,
};

const STATUS_LABELS = {
    NEW: 'New',
    OPEN: 'Open',
    DEFERRED: 'Deferred',
    CLOSED: 'Closed',
} as const;

function formatDiscussionHistory(
    history: DecisionRecordArchiveHistory[],
): string {
    const formattedEntries = history.map(entry =>
        `**${ STATUS_LABELS[entry.previousStatus] } → ${ STATUS_LABELS[entry.newStatus] }**\n` +
        `By <@${ entry.performedBy }> • <t:${ Math.floor(entry.createdAt.getTime() / 1000) }:f>\n` +
        (entry.reason ? `Reason: ${ truncateText(entry.reason, 500) }` : ''),
    );

    const selectedEntries: string[] = [];
    let currentLength = 0;

    // Keep the most recent transitions while preserving chronological order.
    for (let index = formattedEntries.length - 1; index >= 0; index--) {
        const entry = formattedEntries[index];
        const separatorLength = selectedEntries.length > 0 ? 2 : 0;

        if (currentLength + separatorLength + entry.length > 1024) {
            break;
        }

        selectedEntries.unshift(entry);
        currentLength += separatorLength + entry.length;
    }

    const omittedCount = history.length - selectedEntries.length;

    if (omittedCount > 0) {
        const notice = `… ${ omittedCount } earlier transition(s) omitted.`;

        while (
            selectedEntries.length > 0 &&
            notice.length + 2 + selectedEntries.join('\n\n').length > 1024
            ) {
            selectedEntries.shift();
        }

        selectedEntries.unshift(notice);
    }

    return selectedEntries.join('\n\n') || 'No status transitions recorded.';
}

const MAX_EMBED_LENGTH = 6000;
const MAX_FIELD_LENGTH = 1024;

function fitEmbedFields(
    title: string,
    description: string,
    fields: { name: string; value: string; inline?: boolean }[],
    reservedLength = 0
) {
    let remaining = MAX_EMBED_LENGTH
        - title.length
        - description.length
        - reservedLength;

    const fittedFields = [];

    for (const field of fields) {
        const availableLength = Math.min(
            MAX_FIELD_LENGTH,
            remaining - field.name.length,
        );

        if (availableLength < 1) {
            break;
        }

        const value = truncateText(field.value, availableLength);

        fittedFields.push({
            ...field,
            value,
        });

        remaining -= field.name.length + value.length;
    }

    return fittedFields;
}

export function createDecisionRecordArchiveEmbed(
    data: DecisionRecordArchiveData,
): EmbedBuilder {
    const { record, participants, history, closedBy, closedAt } = data;

    const title = record.title;
    const description = `**Final decision: ${ DECISION_LABELS[record.decision] }**`;

    const fields = [
        {
            name: 'Category',
            value: record.category,
            inline: true,
        },
        {
            name: `Participants (${ participants.length })`,
            value: participants.length > 0
                ? participants.map(participant => participant.displayName).join('\n')
                : 'No participants recorded.',
        },
        {
            name: 'Initial proposal',
            value: record.initialProposal,
        },
        {
            name: 'Final summary',
            value: record.finalSummary,
        },
        ...(record.additionalNotes
            ? [{
                name: 'Additional notes',
                value: record.additionalNotes,
            }]
            : []),
        {
            name: 'Discussion history',
            value: formatDiscussionHistory(history),
        },
        {
            name: 'Closure',
            value: `Closed by <@${ closedBy }>\n<t:${ Math.floor(closedAt.getTime() / 1000) }:F>`,
        },
        {
            name: 'Reference',
            value: `Discussion ID: \`${ record.discussionThreadId ?? 'Unavailable' }\``,
        },
    ];

    const footerText = `Decision record: ${ record.id }`;

    return new EmbedBuilder()
    .setColor(DECISION_COLORS[record.decision])
    .setTitle(title)
    .setDescription(description)
    .addFields(
        fitEmbedFields(title, description, fields, footerText.length),
    ).setFooter({
        text: footerText
    });
}