'use strict';

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, mogiri_response, conferences } = require('./config.json');
const devopsdays = require('./src/devopsdays.js');

const conference_names = Object.keys(conferences);
conference_names.map(name => console.log(name));

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;

	// mogiri
	if (commandName === 'mogiri') {
		await interaction.reply(mogiri_response);
		return;
	}

	// $conferences
	if ( conferences[commandName] ) {
		const ordernumber = interaction.options.getString('ordernumber');
		const member = interaction.member;
		await interaction.reply(devopsdays(client, interaction, ordernumber, member, commandName));
	}

	// welcome-$conferences
	if ( conferences[commandName.substring(8)] ) {
		const ordernumber = interaction.options.getString('ordernumber');
		const memberid = interaction.options.getString('memberid');
		const member = interaction.guild.members.cache.get(memberid);
		if (!member) {
			await interaction.reply(memberid + "というメンバーが見つかりませんでした");
			return;
		}
		await interaction.reply(devopsdays(
			client, interaction, ordernumber, member, 
			commandName.substring(8)));
	}
	
});

// Login to Discord with your client's token
client.login(token);


// for docker keep-alive in azure
var http = require('http');
 
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(8080);
 
console.log('Server running at http://localhost:8080/');