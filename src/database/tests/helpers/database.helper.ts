import {
    mkdtempSync,
    rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
    join,
    resolve
} from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

/**
 * Creates an isolated SQLite database and applies the project's migrations.
 *
 * Each invocation gets its own temporary directory and database file.
 * The returned cleanup function closes the connection and removes the files.
 */
export async function createTestDatabase() {
    const temporaryDirectory = mkdtempSync(
        join(tmpdir(), 'swiip-db-test-'),
    );

    const databasePath = join(temporaryDirectory, 'test.sqlite');

    const sqlite = new Database(databasePath);

    try {
        sqlite.pragma('foreign_keys = ON');

        const db = drizzle(sqlite);

        migrate(db, {
            migrationsFolder: resolve(process.cwd(), 'drizzle/migrations'),
        });

        // Ensure foreign-key enforcement remains enabled after migrations.
        sqlite.pragma('foreign_keys = ON');

        return {
            db,
            sqlite,

            cleanup() {
                sqlite.close();

                rmSync(temporaryDirectory, {
                    recursive: true,
                    force: true,
                });
            },
        };
    } catch (error) {
        sqlite.close();

        rmSync(temporaryDirectory, {
            recursive: true,
            force: true,
        });

        throw error;
    }
}