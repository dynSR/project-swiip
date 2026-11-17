import { DISCUSSION_STATUSES } from '../constants/discussion.constants.js';

import type { DiscussionStatus } from '../types/discussion.type.js';

const ALLOWED_TRANSITIONS: Record<DiscussionStatus, readonly DiscussionStatus[]> = {
    [DISCUSSION_STATUSES.NEW]: [
        DISCUSSION_STATUSES.OPEN,
    ],
    [DISCUSSION_STATUSES.OPEN]: [
        DISCUSSION_STATUSES.DEFERRED,
        DISCUSSION_STATUSES.CLOSED,
    ],
    [DISCUSSION_STATUSES.DEFERRED]: [
        DISCUSSION_STATUSES.OPEN,
        DISCUSSION_STATUSES.CLOSED,
    ],
    [DISCUSSION_STATUSES.CLOSED]: [],
};

export function canTransitionDiscussionStatus(
    currentStatus: DiscussionStatus,
    newStatus: DiscussionStatus,
): boolean {
    return ALLOWED_TRANSITIONS[currentStatus].includes(newStatus);
}