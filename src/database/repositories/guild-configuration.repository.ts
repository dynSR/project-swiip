import { eq } from 'drizzle-orm';

import { db } from '../database.js';
import { guildConfigurations } from '../schema/guild-configurations.schema.js';

type GuildConfigurationInsert = Pick<
    typeof guildConfigurations.$inferInsert,
    'guildId' | 'forumChannelId' | 'archiveChannelId'
> & Partial<Pick<
    typeof guildConfigurations.$inferInsert,
    'discussionManagementRoleIds' | 'archiveManagementRoleIds'
>>;

type GuildConfigurationUpdate = Partial<Pick<
    typeof guildConfigurations.$inferInsert,
    | 'forumChannelId'
    | 'archiveChannelId'
    | 'discussionManagementRoleIds'
    | 'archiveManagementRoleIds'
>>;

export function createGuildConfigurationRepository(database = db) {
    return {
        findByGuildId(guildId: string) {
            return database
            .select()
            .from(guildConfigurations)
            .where(eq(guildConfigurations.guildId, guildId))
            .get();
        },

        create(configuration: GuildConfigurationInsert) {
            return database
            .insert(guildConfigurations)
            .values(configuration)
            .returning()
            .get();
        },

        update(guildId: string, changes: GuildConfigurationUpdate) {
            return database
            .update(guildConfigurations)
            .set(changes)
            .where(eq(guildConfigurations.guildId, guildId))
            .returning()
            .get();
        },

        replace(
            guildId: string,
            configuration: Omit<GuildConfigurationInsert, 'guildId'>,
        ) {
            return database
            .update(guildConfigurations)
            .set(configuration)
            .where(eq(guildConfigurations.guildId, guildId))
            .returning()
            .get();
        },
    };
}

export const guildConfigurationRepository = createGuildConfigurationRepository();