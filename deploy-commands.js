const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token, conferences } = require('./config.json');


const commands = [
	new SlashCommandBuilder().setName('mogiri').setDescription('Replies with hi!'),
	new SlashCommandBuilder().setName('mogiri-check').setDescription('Tests!'),
];

Object.keys(conferences).map(name => { 
	console.log(name);

	commands.push(
		new SlashCommandBuilder().setName(name).setDescription('Replies with ' + name + 'Admission!')
		.addStringOption(option =>
			option.setName('ordernumber')
				.setDescription('Eventbrite Order Number')
				.setRequired(true))
	);
	commands.push(
		new SlashCommandBuilder().setName('welcome-' + name).setDescription('Replies with ' + name + 'Admission!')
		.addStringOption(option =>
		option.setName('ordernumber')
			.setDescription('Eventbrite Order Number')
			.setRequired(true))
		.addStringOption(option =>
			option.setName('memberid')
				.setDescription('Discord Member ID')
				.setRequired(true))
	);
});

const commandsJson = commands.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsJson })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);