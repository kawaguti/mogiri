'use strict';

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, mogiri_response, conferences } = require('./config.json');
const mogiri = require('./src/mogiri.js');

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
		const conference_name = commandName;
		await interaction.reply(mogiri(client, interaction, 
			ordernumber, member, conference_name));
	}

	// welcome-$conferences
	if ( conferences[commandName.substring(8)] ) {

		//check : the member is exist
		const memberid = interaction.options.getString('memberid');
		const member_check = interaction.guild.members.cache.get(memberid);
		if (!member_check) {
			await interaction.reply(memberid + "というメンバーが見つかりませんでした");
			return;
		}

		// $conferences
		const ordernumber = interaction.options.getString('ordernumber');
		const member = member_check;
		const conference_name = commandName.substring(8);
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