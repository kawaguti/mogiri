// Gateway 版のスラッシュコマンドを各サーバーに登録する。
// @discordjs/builders・@discordjs/rest・discord-api-types を使っていたが、
// 依存を減らすため同じ JSON を手で組み立て、fetch で登録する（登録される内容は以前と同じ）。
const { clientId, token, guilds } = require('./config.json');

const STRING = 3;

Object.keys(guilds).map ( name => {
	console.log(name);

	const guildId = guilds[name].guildId;
	console.log(guildId);

	console.log(name);
	const commands = [];
	commands.push({ name: 'mogiri', description: 'Replies with hi!', options: [] });
	commands.push({ name: 'mogiri-check', description: 'Tests!', options: [] });

	guilds[name].conferences.map ( name => {
		commands.push({
			name,
			description: 'Replies with ' + name + ' Admission!',
			options: [{ type: STRING, name: 'ordernumber', description: 'Eventbrite Order Number', required: true }],
		});
	});

	console.log(commands);
	fetch(`https://discord.com/api/v9/applications/${clientId}/guilds/${guildId}/commands`, {
		method: 'PUT',
		headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(commands),
	})
		.then(res => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			console.log('Successfully registered application commands.');
		})
		.catch(console.error);
});
