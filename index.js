'use strict';

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, mogiri_response, conferences } = require('./config.json');
const mogiri = require('./src/mogiri.js');
const mogiri_check = require('./src/mogiri-check.js');

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

	// mogiri-check
	if (commandName === 'mogiri-check') {
		conference_names.forEach ( conference_name => {
			mogiri_check(client, interaction, conference_name);
		});
		await interaction.reply("mogiri-check");
		return;
	}

	// $conferences
	if ( conferences[commandName] ) {
		const ordernumber = interaction.options.getString('ordernumber');
		const member = interaction.member;
		const conference_name = commandName;
		await interaction.reply(mogiri(client, interaction, 
			ordernumber, member, conference_name));
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