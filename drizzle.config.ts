import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/database/schema/*',
    out: './drizzle/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: './data/bot.sqlite',
    },
});
