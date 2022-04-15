// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, eventbrite_private_key, discord_role, eventbrite_event_id } = require('./config.json');
const axios = require('axios');

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
		await interaction.reply('ワタシハmogiriデス。って機械かーい！');
		return;
	}

	// devopsdays
	if (commandName === 'devopsdays') {
		const channelId = interaction.channelId;
        const member = interaction.member;
    	const ordernumber = interaction.options.getString('ordernumber');

		// check roles
		const role = interaction.guild.roles.cache.find(role => role.name === discord_role);
		if (role == "") {
            await interaction.reply(discord_role + "のロールがサーバー上に見つかりませんでした");
			return;
		} else if (interaction.member.roles.cache.some(role => role.name === discord_role)) {
			await interaction.reply("すでに" + role.name + "のロールをお持ちでした！");
			return;
		}

		// check eventbrite_order_id format
		const re = /(\d{10})/;
		if ( re.exec(ordernumber) == null) {
			await interaction.reply(ordernumber + "はEventbriteオーダー番号の形式ではありません。");
			return;
		}

		// capture eventbrite_order_id
		const eventbrite_order_id = re.exec(ordernumber)[1];
		await interaction.reply("Asking for Eventbrite: " + eventbrite_order_id);

		// asking for eventbrite
		if ( eventbrite_order_id ) {
			axios.get('https://www.eventbriteapi.com/v3/orders/'
                    + eventbrite_order_id,
                    { headers: {
                        Authorization: `Bearer ${eventbrite_private_key}`,
                    }
            })
            .then(function (response) {
                if (response.data.event_id == eventbrite_event_id) {
                    client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。")
                    member.roles.add(role);
                    client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
                }
            })
            .catch(function (error) {
                client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。")
            })
        }
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