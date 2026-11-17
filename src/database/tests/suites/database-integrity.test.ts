import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestDatabase } from '../helpers/database.helper.js';

test('Database integrity', async (t) => {
    const { sqlite, cleanup } = await createTestDatabase();

    t.after(cleanup);

    await t.test('SQLite database integrity is valid', () => {
        const result = sqlite.pragma('integrity_check', {
            simple: true,
        });

        assert.equal(result, 'ok');
    });

    await t.test('Foreign-key enforcement is enabled', () => {
        const result = sqlite.pragma('foreign_keys', {
            simple: true,
        });

        assert.equal(result, 1);
    });

    await t.test('No foreign-key violations exist', () => {
        const violations = sqlite.pragma('foreign_key_check');

        assert.deepEqual(violations, []);
    });

    await t.test('All expected application tables exist', () => {
        const tables = sqlite.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
        `).all() as { name: string }[];

        const tableNames = tables.map(table => table.name);

        const expectedTables = [
            'guild_configurations',
            'discussions',
            'discussion_histories',
            'decision_records',
            'decision_record_versions',
        ];

        for (const tableName of expectedTables) {
            assert.ok(
                tableNames.includes(tableName),
                `Missing expected table: ${ tableName }`,
            );
        }
    });
});