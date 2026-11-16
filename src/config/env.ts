import {
    AppError,
    ERROR_CODES
} from '../shared/errors/app.error.js';

export function getRequiredEnv(key: string): string {
    const value = process.env[key];

    if (!value) {
        throw new AppError(
            ERROR_CODES.CHANNEL_NOT_FOUND,
            `Missing required environment variable: ${ key }`,
        );
    }

    return value;
}