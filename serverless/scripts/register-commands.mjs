// サーバー（guild）に mogiri / mogiri-check / mogiri-admin を登録する（最初の1回だけ）。
// カンファレンスごとのコマンドは、そのあと Discord 上で /mogiri-admin add すれば Worker が登録する。
//
// 使い方（PowerShell）:
//   $env:DISCORD_APPLICATION_ID = "..."; $env:DISCORD_BOT_TOKEN = "..."
//   node scripts/register-commands.mjs <guildId>
//
// ※ Interactions Endpoint URL には一切触れない。コマンド登録だけなら Gateway 版の本番には影響しない。

import { BASE_COMMANDS } from '../src/commands.js';
import { API_BASE, createDiscordClient } from '../src/discord.js';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.argv[2];

if (!applicationId || !token || !/^\d+$/.test(guildId || '')) {
    console.error('usage: DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... node scripts/register-commands.mjs <guildId>');
    process.exit(1);
}

// どのアプリケーションに登録するのかを必ず表示する（本番アプリと取り違えないため）
const me = await fetch(`${API_BASE}/applications/@me`, { headers: { Authorization: `Bot ${token}` } }).then(r => r.json());
if (me.id !== applicationId) {
    console.error(`DISCORD_APPLICATION_ID (${applicationId}) とトークンのアプリケーション (${me.id}) が一致しません`);
    process.exit(1);
}
console.log(`application: ${me.name} (${me.id})`);
console.log(`interactions_endpoint_url: ${me.interactions_endpoint_url || '(未設定)'}`);

const discord = createDiscordClient({ token });
for (const command of BASE_COMMANDS) {
    // POST は同名のコマンドを上書きするだけなので、登録済みのカンファレンスのコマンドは消えない
    await discord.upsertGuildCommand(applicationId, guildId, command);
    console.log(`registered /${command.name} in guild ${guildId}`);
}
