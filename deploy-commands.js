const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('mogiri').setDescription('Replies with hi!'),
    new SlashCommandBuilder().setName('devopsdays').setDescription('Replies with DevOpsDays Admission!')
    	.addStringOption(option =>
		option.setName('ordernumber')
			.setDescription('Eventbrite Order Number')
			.setRequired(true)),
	new SlashCommandBuilder().setName('welcome-devopsdays').setDescription('Replies with DevOpsDays Admission!')
			.addStringOption(option =>
			option.setName('ordernumber')
				.setDescription('Eventbrite Order Number')
				.setRequired(true))
			.addStringOption(option =>
				option.setName('memberid')
					.setDescription('Discord Member ID')
					.setRequired(true)),	
	]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);