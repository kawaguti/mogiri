'use strict';

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, mogiri_response } = require('./config.json');
const devopsdays = require('./src/devopsdays.js');


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

	// devopsdays
	if (commandName === 'devopsdays') {
		await interaction.reply(devopsdays(client, interaction));
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