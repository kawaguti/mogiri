// Gateway 版が受付チャンネルに投稿したチェックイン記録（「XXXXXは有効なPretixオーダー番号です。 [conf] ...」）を
// 読み、D1 の checkins に入れる SQL を作る。本番切り替えのときに一度だけ使う。
// 読むのは Bot 自身が投稿したメッセージだけ（参加者が同じ文面を書き込んでも数えない）。
//
// 使い方（PowerShell）:
//   $env:DISCORD_BOT_TOKEN = "..."
//   node scripts/import-checkins.mjs <guildId> <channelId> [--max 1500] [--conference <タグなしの記録に使う名前>] > checkins.sql
//   npx wrangler d1 execute mogiri --remote --env production --file=checkins.sql

import { pathToFileURL } from 'node:url';
import { API_BASE, createDiscordClient } from '../src/discord.js';
import { sql } from './import-config.mjs';

const CHECKIN_PATTERN = /^([A-Za-z0-9]+)は有効なPretixオーダー番号です。(?: \[([a-z0-9_-]+)\])?/;

// 戻り値: { order, conference } または null
export function parseCheckinMessage(content, defaultConference) {
    const m = CHECKIN_PATTERN.exec(content);
    if (!m) return null;
    const conference = m[2] || defaultConference;
    return conference ? { order: m[1], conference } : null;
}

export function toInsert(message, guildId, parsed) {
    return 'INSERT OR IGNORE INTO checkins (guild_id, conference, order_number, message_id, created_at) VALUES ('
        + [guildId, parsed.conference, parsed.order, message.id, new Date(message.timestamp).toISOString()].map(sql).join(', ') + ');';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [guildId, channelId, ...rest] = process.argv.slice(2);
    const flag = name => {
        const i = rest.indexOf(name);
        return i >= 0 ? rest[i + 1] : undefined;
    };
    const max = Number(flag('--max') || 1500);
    const defaultConference = flag('--conference');
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token || !/^\d+$/.test(guildId || '') || !/^\d+$/.test(channelId || '')) {
        console.error('usage: DISCORD_BOT_TOKEN=... node scripts/import-checkins.mjs <guildId> <channelId> [--max 1500] [--conference name]');
        process.exit(1);
    }

    const botUser = await fetch(`${API_BASE}/users/@me`, { headers: { Authorization: `Bot ${token}` } }).then(r => r.json());
    const discord = createDiscordClient({ token });
    let before;
    let read = 0;
    let imported = 0;
    let untagged = 0;
    while (read < max) {
        const messages = await discord.getChannelMessages(channelId, before);
        if (messages.length === 0) break;
        for (const message of messages) {
            if (message.author?.id !== botUser.id) continue;
            const parsed = parseCheckinMessage(message.content, defaultConference);
            if (parsed) {
                console.log(toInsert(message, guildId, parsed));
                imported++;
            }
            else if (CHECKIN_PATTERN.test(message.content)) {
                untagged++;
            }
        }
        read += messages.length;
        before = messages[messages.length - 1].id;
        await new Promise(r => setTimeout(r, 200));
    }
    console.error(`read ${read} messages as ${botUser.username}, imported ${imported} checkins` +
        (untagged ? `, skipped ${untagged} without [conference] tag (use --conference)` : ''));
}
