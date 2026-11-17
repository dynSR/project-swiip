import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    Collection,
    type Guild,
    type Message,
    type ThreadChannel,
} from 'discord.js';

import { createDiscussionParticipantService } from '../discussion-participant.service.js';

function createMessage(
    id: string,
    author: {
        id: string;
        bot?: boolean;
        globalName?: string | null;
        username?: string;
    },
    options: {
        displayName?: string;
        webhookId?: string | null;
    } = {},
): Message<true> {
    return {
        id,
        author: {
            id: author.id,
            bot: author.bot ?? false,
            globalName: author.globalName ?? null,
            username: author.username ?? author.id,
        },
        member: options.displayName
            ? { displayName: options.displayName }
            : null,
        webhookId: options.webhookId ?? null,
    } as unknown as Message<true>;
}

function createMessageCollection(messages: Message<true>[]) {
    const collection = new Collection<string, Message<true>>();

    for (const message of messages) {
        collection.set(message.id, message);
    }

    return collection;
}

test('Discussion participant service', async (t) => {
    await t.test('should return unique human participants and ignore bots and webhooks', async () => {
        const messages = createMessageCollection([
            createMessage('1', { id: 'user-1' }, { displayName: 'Player One' }),
            createMessage('2', { id: 'user-1' }),
            createMessage('3', { id: 'user-2', globalName: 'Player Two' }),
            createMessage('4', { id: 'user-3', globalName: null, username: 'player_three' }),
            createMessage('5', { id: 'bot-1', bot: true }),
            createMessage('6', { id: 'user-4' }, { webhookId: 'webhook-1' }),
        ]);

        const thread = {
            messages: {
                fetch: async () => messages,
            },
        } as unknown as ThreadChannel;

        const service = createDiscussionParticipantService(
            async () => thread,
        );

        const participants = await service.getDiscussionParticipants(
            {} as Guild,
            'thread-1',
        );

        assert.deepEqual(participants, [
            { userId: 'user-1', displayName: 'Player One' },
            { userId: 'user-2', displayName: 'Player Two' },
            { userId: 'user-3', displayName: 'player_three' },
        ]);
    });

    await t.test('should paginate when the thread contains more than 100 messages', async () => {
        const firstPage = createMessageCollection(
            Array.from({ length: 100 }, (_, index) =>
                createMessage(
                    String(index + 1),
                    { id: `user-${ index + 1 }` },
                ),
            ),
        );

        const secondPage = createMessageCollection([
            createMessage('101', { id: 'user-101' }),
        ]);

        const fetchCalls: Array<{ limit: number; before?: string }> = [];

        const thread = {
            messages: {
                fetch: async (options: { limit: number; before?: string }) => {
                    fetchCalls.push(options);

                    return fetchCalls.length === 1
                        ? firstPage
                        : secondPage;
                },
            },
        } as unknown as ThreadChannel;

        const service = createDiscussionParticipantService(
            async () => thread,
        );

        const participants = await service.getDiscussionParticipants(
            {} as Guild,
            'thread-1',
        );

        assert.equal(fetchCalls.length, 2);
        assert.equal(fetchCalls[0].limit, 100);
        assert.equal(fetchCalls[1].limit, 100);
        assert.equal(fetchCalls[1].before, firstPage.last()?.id);
        assert.equal(participants.length, 101);
    });
});