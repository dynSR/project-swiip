import type { ForumChannel } from 'discord.js';

import {
    DISCUSSION_CATEGORIES,
    DISCUSSION_LEVELS,
    DISCUSSION_STATUSES,
} from '../constants/discussion.constants.js';

import type {
    DiscussionCategory,
    DiscussionLevel,
    DiscussionStatus,
    DiscussionTagName,
} from '../types/discussion.type.js';

import {
    AppError,
    ERROR_CODES,
} from '../errors/app.error.js';

export function getForumTagId(
    forum: ForumChannel,
    tagName: DiscussionTagName,
): string {
    const tag = forum.availableTags.find(
        availableTag => availableTag.name === tagName,
    );

    if (!tag) {
        throw new AppError(
            ERROR_CODES.FORUM_TAG_NOT_FOUND,
            `Forum tag "${ tagName }" is not configured in "${ forum.name }".`,
        );
    }

    return tag.id;
}

export function getDiscussionTagIds(
    forum: ForumChannel,
    category: DiscussionCategory,
    level: DiscussionLevel,
    status: DiscussionStatus,
): string[] {
    return [
        getForumTagId(forum, status),
        getForumTagId(forum, level),
        getForumTagId(forum, category),
    ];
}

export function isDiscussionStatus(
    value: string,
): value is DiscussionStatus {
    return Object.values(DISCUSSION_STATUSES).some(
        status => status === value,
    );
}

export function isDiscussionLevel(
    value: string,
): value is DiscussionLevel {
    return Object.values(DISCUSSION_LEVELS).some(
        level => level === value,
    );
}

export function isDiscussionCategory(
    value: string,
): value is DiscussionCategory {
    return Object.keys(DISCUSSION_CATEGORIES).some(
        category => category === value,
    );
}