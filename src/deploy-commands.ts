import 'dotenv/config';

import {
    REST,
    Routes
} from 'discord.js';

import { discussionCommand } from "./app/commands/discussion.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if ( !token || !clientId || !guildId ) {
    throw new Error( 'Missing environment variables.' );
}

const commands = [
    discussionCommand.toJSON()
];

const rest = new REST( { version: '10' } ).setToken( token );

async function deployCommands() {
    try {
        console.log( 'Deploying application commands...' );
        await rest.put(
            Routes.applicationGuildCommands( clientId as string, guildId as string ),
            { body: commands }
        );

        console.log( 'Successfully registered application commands!' )
    }
    catch ( error ) {
        console.error( 'Failed to register commands', error );
    }
}

deployCommands();