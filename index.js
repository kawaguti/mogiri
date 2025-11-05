'use strict';

// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, mogiri_response, conferences, guilds } = require('./config.json');
const mogiri = require('./src/mogiri.js');
const mogiri_check = require('./src/mogiri-check.js');

const conference_names = Object.keys(conferences);
conference_names.map(name => console.log(name));

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// チェックイン履歴のキャッシュ: channelId -> Set<メッセージ内容>
const checkinCache = new Map();
// キャッシュメタデータ: channelId -> {oldestCheckin: {content, date, orderId}}
const checkinCacheMetadata = new Map();
// キャッシュをエクスポートして mogiri.js からアクセス可能にする
global.checkinCache = checkinCache;
global.checkinCacheMetadata = checkinCacheMetadata;
global.guilds = guilds;

// 起動時にチェックインチャンネルのメッセージをキャッシュ
async function cacheCheckinChannel(client, channelId, guildName) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        console.log(`⚠️ チャンネルが見つかりません: ${guildName} (${channelId})`);
        return;
    }

    const messageSet = new Set();
    let lastMessageId = null;
    let fetchCount = 0;
    let oldestCheckinMessage = null;
    const maxFetch = 15; // 1500件まで

    console.log(`キャッシュ構築中: ${guildName}...`);

    while (fetchCount < maxFetch) {
        try {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            messages.forEach(msg => {
                // "は有効なPretixオーダー番号です" を含むメッセージのみ
                if (msg.content.includes("は有効なPretixオーダー番号です")) {
                    messageSet.add(msg.content);
                    // 最古のメッセージを記録（古い順に処理されるので、常に更新）
                    oldestCheckinMessage = msg;
                }
            });

            lastMessageId = messages.last().id;
            fetchCount++;

            // Discord APIレート制限対策: 少し待機
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`キャッシュ構築エラー (${guildName}):`, error.message);
            break;
        }
    }

    checkinCache.set(channelId, messageSet);

    // メタデータを保存
    if (oldestCheckinMessage) {
        // 注文番号を抽出（最初のスペースの前）
        const orderId = oldestCheckinMessage.content.split(' ')[0];
        checkinCacheMetadata.set(channelId, {
            oldestCheckin: {
                content: oldestCheckinMessage.content,
                date: oldestCheckinMessage.createdAt,
                orderId: orderId
            }
        });
    }

    console.log(`✅ ${guildName}: ${messageSet.size}件のチェックイン履歴をキャッシュ`);
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
	console.log('Ready!');

	// 各guildの受付チャンネルをキャッシュ
	if (guilds) {
		for (const [guildName, guildConfig] of Object.entries(guilds)) {
			if (guildConfig.checkin_channel_id) {
				await cacheCheckinChannel(client, guildConfig.checkin_channel_id, guildName);
			}
		}
		console.log('✅ チェックインキャッシュ構築完了');
	}
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
		const response = await mogiri(client, interaction, 
			ordernumber, member, conference_name);
		await interaction.reply(response);
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
