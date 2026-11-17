import {
    type APIRole,
    type Guild,
    Role
} from 'discord.js';

import {
    AppError,
    ERROR_CODES,
} from '../errors/app.error.js';

export function validateGuildRole(
    guild: Guild,
    role: APIRole | Role | null,
): void {
    if (!role) {
        return;
    }

    if (role instanceof Role && role.guild.id !== guild.id) {
        throw new AppError(
            ERROR_CODES.ROLE_NOT_IN_GUILD,
            `Role "${ role.name }" does not belong to this server.`,
        );
    }
}