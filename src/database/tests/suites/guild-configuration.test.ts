import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type { Guild } from 'discord.js';

import { createGuildConfigurationRepository } from '../../repositories/guild-configuration.repository.js';
import { createGuildConfigurationService } from '../../../app/services/guild-configuration.service.js';
import { createTestDatabase } from '../helpers/database.helper.js';

function createSetupInput(guildId: string) {
    return {
        guild: { id: guildId } as Guild,
        forumChannelId: randomUUID(),
        archiveChannelId: randomUUID(),
        discussionManagementRoleId: null,
        archiveManagementRoleId: null,
    };
}

test('Guild configuration', async (t) => {
    const { db, cleanup } = await createTestDatabase();

    t.after(cleanup);

    const repository = createGuildConfigurationRepository(db);
    const service = createGuildConfigurationService(repository);

    await t.test('should create a configuration for a new guild', () => {
        const input = createSetupInput(randomUUID());

        const configuration = service.setupGuildConfiguration(input);

        assert.ok(configuration);
        assert.equal(configuration.guildId, input.guild.id);
        assert.equal(configuration.forumChannelId, input.forumChannelId);
        assert.equal(configuration.archiveChannelId, input.archiveChannelId);
        assert.deepEqual(configuration.discussionManagementRoleIds, []);
        assert.deepEqual(configuration.archiveManagementRoleIds, []);
    });

    await t.test('should retrieve an existing configuration', () => {
        const input = createSetupInput(randomUUID());

        service.setupGuildConfiguration(input);

        const configuration = repository.findByGuildId(input.guild.id);

        assert.ok(configuration);
        assert.equal(configuration.guildId, input.guild.id);
    });

    await t.test('should replace an existing configuration', () => {
        const input = createSetupInput(randomUUID());

        service.setupGuildConfiguration(input);

        const updatedInput = {
            ...input,
            forumChannelId: randomUUID(),
            archiveChannelId: randomUUID(),
            discussionManagementRoleId: randomUUID(),
            archiveManagementRoleId: randomUUID(),
        };

        const configuration = service.setupGuildConfiguration(updatedInput);

        assert.ok(configuration);
        assert.equal(configuration.forumChannelId, updatedInput.forumChannelId);
        assert.equal(configuration.archiveChannelId, updatedInput.archiveChannelId);
        assert.deepEqual(
            configuration.discussionManagementRoleIds,
            [updatedInput.discussionManagementRoleId]
        );
        assert.deepEqual(
            configuration.archiveManagementRoleIds,
            [updatedInput.archiveManagementRoleId]
        );
    });

    await t.test('should clear role assignments when roles are omitted', () => {
        const input = createSetupInput(randomUUID());

        service.setupGuildConfiguration({
            ...input,
            discussionManagementRoleId: randomUUID(),
            archiveManagementRoleId: randomUUID(),
        });

        const configuration = service.setupGuildConfiguration(input);

        assert.ok(configuration);
        assert.deepEqual(configuration.discussionManagementRoleIds, []);
        assert.deepEqual(configuration.archiveManagementRoleIds, []);
    });

    await t.test('should keep configurations isolated between guilds', () => {
        const firstInput = createSetupInput(randomUUID());
        const secondInput = createSetupInput(randomUUID());

        service.setupGuildConfiguration(firstInput);
        service.setupGuildConfiguration(secondInput);

        const firstConfiguration = repository.findByGuildId(firstInput.guild.id);
        const secondConfiguration = repository.findByGuildId(secondInput.guild.id);

        assert.ok(firstConfiguration);
        assert.ok(secondConfiguration);

        assert.notEqual(firstConfiguration.guildId, secondConfiguration.guildId);
        assert.notEqual(firstConfiguration.forumChannelId, secondConfiguration.forumChannelId);
    });

    await t.test('should reject duplicate guild configurations', () => {
        const input = createSetupInput(randomUUID());

        repository.create({
            guildId: input.guild.id,
            forumChannelId: input.forumChannelId,
            archiveChannelId: input.archiveChannelId,
        });

        assert.throws(() => {
            repository.create({
                guildId: input.guild.id,
                forumChannelId: randomUUID(),
                archiveChannelId: randomUUID(),
            });
        });
    });
});