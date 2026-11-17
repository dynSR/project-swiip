import { randomUUID } from 'node:crypto';

import { guildConfigurations } from '../../schema/guild-configurations.schema.js';
import type { createTestDatabase } from '../helpers/database.helper.js';

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db'];

export function createGuildConfiguration(
    db: TestDatabase,
) {
    const configuration: typeof guildConfigurations.$inferInsert = {
        guildId: randomUUID(),
        forumChannelId: randomUUID(),
        archiveChannelId: randomUUID(),
        discussionManagementRoleIds: [],
        archiveManagementRoleIds: [],
    };

    db.insert(guildConfigurations)
    .values(configuration)
    .run();

    return configuration;
}