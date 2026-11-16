export const ERROR_CODES = {
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

    CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
    CHANNEL_NOT_FORUM: 'CHANNEL_NOT_FORUM',
    THREAD_NOT_FOUND: 'THREAD_NOT_FOUND',
    FORUM_TAG_NOT_FOUND: 'FORUM_TAG_NOT_FOUND',

    INVALID_DISCUSSION_STATUS: 'INVALID_DISCUSSION_STATUS',
    INVALID_DISCUSSION_CATEGORY: 'INVALID_DISCUSSION_CATEGORY',
    INVALID_DISCUSSION_LEVEL: 'INVALID_DISCUSSION_LEVEL',
} as const;

export type ErrorCode =
    typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);

        this.name = 'AppError';
    }
}