import { decisionRecordRepository } from '../../database/repositories/decision-record.repository.js';
import { discussionRepository } from '../../database/repositories/discussion.repository.js';
import { guildConfigurationRepository } from '../../database/repositories/guild-configuration.repository.js';

import {
    DECISION_OUTCOMES,
    DISCUSSION_STATUSES
} from '../../shared/constants/discussion.constants.js';

type DecisionOutcome = typeof DECISION_OUTCOMES[keyof typeof DECISION_OUTCOMES];

interface PrepareDecisionRecordInput {
    threadId: string;
    decision: DecisionOutcome;
    finalSummary: string;
    additionalNotes: string | null;
    performedBy: string;
}

export function createDecisionRecordService(
    decisionRecordRepo = decisionRecordRepository,
    discussionRepo = discussionRepository,
) {
    return {
        prepareDecisionRecord(input: PrepareDecisionRecordInput) {
            const discussion = discussionRepo.findByThreadId(input.threadId);

            if (!discussion) {
                throw new Error(
                    `Discussion "${ input.threadId }" was not found.`,
                );
            }

            if (
                discussion.status !== DISCUSSION_STATUSES.OPEN
                && discussion.status !== DISCUSSION_STATUSES.DEFERRED
            ) {
                throw new Error(
                    `Cannot prepare a decision record for a discussion with status "${ discussion.status }".`,
                );
            }

            const additionalNotes = input.additionalNotes?.trim() || null;
            
            const finalSummary = input.finalSummary.trim();
            if (!finalSummary) {
                throw new Error('Final summary cannot be empty.');
            }

            const existingRecord = decisionRecordRepo.findByDiscussionThreadId(
                input.threadId,
            );

            if (existingRecord) {
                const matchesInput =
                    existingRecord.decision === input.decision
                    && existingRecord.finalSummary === input.finalSummary.trim()
                    && existingRecord.additionalNotes === additionalNotes;

                if (!matchesInput) {
                    throw new Error(
                        'A decision record already exists with different closing information.',
                    );
                }

                return existingRecord;
            }

            return decisionRecordRepo.create({
                guildId: discussion.guildId,
                discussionThreadId: discussion.threadId,
                archiveChannelId: discussion.archiveChannelId,
                archiveMessageId: null,
                title: discussion.title,
                category: discussion.category,
                initialProposal: discussion.proposal,
                decision: input.decision,
                finalSummary: finalSummary,
                additionalNotes,
                createdBy: input.performedBy,
            });
        },
    };
}

export const {
    prepareDecisionRecord,
} = createDecisionRecordService();