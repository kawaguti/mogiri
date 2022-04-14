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
    const ordernumber = interaction.options.getString('ordernumber');
	console.log(ordernumber);

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
	} else if (commandName === 'user') {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
    } else if (commandName === 'devopsdays') {
        const channelId = interaction.channelId;
        const member = interaction.member;
        const role = interaction.guild.roles.cache.find(role => role.name === discord_role);
        if (role) {
            if (interaction.member.roles.cache.some(role => role.name === discord_role)) {
                client.channels.cache.get(channelId).send("すでに" + role.name + "のロールをお持ちでした！");
            }
        } else {
            client.channels.cache.get(channelId).send(discord_role + "のロールがサーバー上に見つかりませんでした");
        }
        await interaction.reply(`Welcome to DevOpsDays Tokyo: ${interaction.user.tag}\nYour id: ${interaction.user.id}\nYour Order Number: ${interaction.options.getString('ordernumber')}`);
        const re = /#(\d{10})([^\d]|$)/;
        if (( match_strings = re.exec(interaction.options.getString('ordernumber'))) !== null) {
            const eventbrite_order_id = match_strings[1];
            axios.get('https://www.eventbriteapi.com/v3/orders/'
                    + eventbrite_order_id,
                    { headers: {
                        Authorization: `Bearer ${eventbrite_private_key}`,
                    }
            })
            .then(function (response) {
                if (response.data.event_id == eventbrite_event_id) {
                    console.log('okmaru!');
                    client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。")
                    member.roles.add(role);
                    client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
                }
            })
            .catch(function (error) {
                console.log('damemaru!');
                client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。")
            })
        } else {
            client.channels.cache.get(channelId).send(interaction.options.getString('ordernumber') + "はEventbriteオーダー番号の形式ではありません。")
        }
    }
});

// Login to Discord with your client's token
client.login(token);