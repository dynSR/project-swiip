import type { Guild } from 'discord.js';

import { decisionRecordRepository } from '../../database/repositories/decision-record.repository.js';
import { discussionHistoryRepository } from '../../database/repositories/discussion-history.repository.js';

import {
    getTextChannel,
} from '../../shared/helpers/channel.helpers.js';

import {
    createDecisionRecordArchiveEmbed,
} from '../components/decision-record-archive.component.js';

import {
    getDiscussionParticipants,
} from './discussion-participant.service.js';

async function findExistingArchiveMessage(
    channel: Awaited<ReturnType<typeof getTextChannel>>,
    recordId: string,
) {
    const marker = `Decision record: ${ recordId }`;

    let before: string | undefined;

    while (true) {
        const messages = await channel.messages.fetch({
            limit: 100,
            ...(before ? { before } : {}),
        });

        const existingMessage = messages.find(message =>
            message.embeds.some(embed => embed.footer?.text === marker),
        );

        if (existingMessage) {
            return existingMessage;
        }

        if (messages.size < 100) {
            return null;
        }

        const oldestMessage = messages.last();

        if (!oldestMessage || oldestMessage.id === before) {
            return null;
        }

        before = oldestMessage.id;
    }
}

interface DecisionRecordArchiveDependencies {
    decisionRecordRepo: Omit<typeof decisionRecordRepository, 'updateArchiveMessageId'> & {
        updateArchiveMessageId(
            id: string,
            archiveMessageId: string,
        ): ReturnType<typeof decisionRecordRepository.updateArchiveMessageId> | undefined;
    };
    discussionHistoryRepo: typeof discussionHistoryRepository;
    getTextChannel: typeof getTextChannel;
    getDiscussionParticipants: typeof getDiscussionParticipants;
    createDecisionRecordArchiveEmbed: typeof createDecisionRecordArchiveEmbed;
}

export function createDecisionRecordArchiveService(
    dependencies: Partial<DecisionRecordArchiveDependencies> = {},
) {
    const {
        decisionRecordRepo = decisionRecordRepository,
        discussionHistoryRepo = discussionHistoryRepository,
        getTextChannel: fetchTextChannel = getTextChannel,
        getDiscussionParticipants: fetchParticipants = getDiscussionParticipants,
        createDecisionRecordArchiveEmbed: buildArchiveEmbed = createDecisionRecordArchiveEmbed,
    } = dependencies;

    return {
        async publishDecisionRecordArchive(
            guild: Guild,
            recordId: string,
            closedBy: string,
            closedAt: Date,
        ) {
            const record = decisionRecordRepo.findById(recordId);

            if (!record) {
                throw new Error(`Decision record "${ recordId }" was not found.`);
            }

            if (record.guildId !== guild.id) {
                throw new Error('The decision record belongs to another server.');
            }

            if (record.archiveMessageId) {
                return {
                    record,
                    messageId: record.archiveMessageId,
                };
            }

            if (!record.discussionThreadId) {
                throw new Error('The decision record has no associated discussion thread.');
            }

            const archiveChannel = await fetchTextChannel(
                guild,
                record.archiveChannelId,
            );

            const existingMessage = await findExistingArchiveMessage(
                archiveChannel,
                record.id,
            );

            if (existingMessage) {
                const updatedRecord = decisionRecordRepo.updateArchiveMessageId(
                    record.id,
                    existingMessage.id,
                );

                if (!updatedRecord) {
                    throw new Error('Failed to reconcile the existing archive message.');
                }

                return {
                    record: updatedRecord,
                    messageId: existingMessage.id,
                };
            }

            const participants = await fetchParticipants(
                guild,
                record.discussionThreadId,
            );

            const history = discussionHistoryRepo.findByDiscussionThreadId(
                record.discussionThreadId,
            );

            const embed = buildArchiveEmbed({
                record,
                participants,
                history,
                closedBy,
                closedAt,
            });

            const message = await archiveChannel.send({
                embeds: [embed],
            });

            const updatedRecord = decisionRecordRepo.updateArchiveMessageId(
                record.id,
                message.id,
            );

            if (!updatedRecord) {
                throw new Error(
                    `Archive message "${ message.id }" was published, but its ID could not be saved.`,
                );
            }

            return {
                record: updatedRecord,
                messageId: message.id,
            };
        },
    };
}

export const {
    publishDecisionRecordArchive,
} = createDecisionRecordArchiveService();