const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token, guilds } = require('./config.json');

Object.keys(guilds).map ( name => {
	console.log(name);

	const guildId = guilds[name].guildId;
	console.log(guildId);

	console.log(name);
	const commands = [];
	commands.push( new SlashCommandBuilder().setName('mogiri').setDescription('Replies with hi!'));
	commands.push( new SlashCommandBuilder().setName('mogiri-check').setDescription('Tests!'));

	guilds[name].conferences.map ( name => {
		commands.push(
			new SlashCommandBuilder().setName(name).setDescription('Replies with ' + name + ' Admission!')
			.addStringOption(option =>
				option.setName('ordernumber')
					.setDescription('Eventbrite Order Number')
					.setRequired(true))
		);
	});

	const commandsJson = commands.map(command => command.toJSON());
	console.log(commandsJson);
	const rest = new REST({ version: '9' }).setToken(token);
	rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsJson })
			.then(() => console.log('Successfully registered application commands.'))
			.catch(console.error);	
});
