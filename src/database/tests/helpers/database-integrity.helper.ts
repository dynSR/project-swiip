import assert from 'node:assert/strict';

import type Database from 'better-sqlite3';

export function assertDatabaseIntegrity(sqlite: Database.Database) {
    const integrity = sqlite.pragma('integrity_check', {
        simple: true,
    });

    assert.equal(integrity, 'ok');

    const foreignKeyViolations = sqlite.pragma('foreign_key_check');

    assert.deepEqual(foreignKeyViolations, []);

    const foreignKeysEnabled = sqlite.pragma('foreign_keys', {
        simple: true,
    });

    assert.equal(foreignKeysEnabled, 1);
}