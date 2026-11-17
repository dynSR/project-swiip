import {
    DISCUSSION_CATEGORIES,
    DISCUSSION_LEVELS,
    DISCUSSION_STATUSES,
} from '../constants/discussion.constants.js';

export type DiscussionStatus =
    typeof DISCUSSION_STATUSES[keyof typeof DISCUSSION_STATUSES];

export type DiscussionLevel =
    typeof DISCUSSION_LEVELS[keyof typeof DISCUSSION_LEVELS];

export type DiscussionCategory = typeof DISCUSSION_CATEGORIES[keyof typeof DISCUSSION_CATEGORIES];

export type DiscussionTagName =
    | DiscussionStatus
    | DiscussionLevel
    | DiscussionCategory;

export interface DiscussionData {
    title: string;
    context: string;
    proposal: string;
    category: DiscussionCategory;
    level: DiscussionLevel;
}