// Gateway 版の config.json から、Pretix のカンファレンス設定を D1 に入れる SQL を作る。
// API キーそのものは出力しない。必要な Secret の名前だけを標準エラーに表示する。
//
// 使い方:
//   node scripts/import-config.mjs ../config.json > conferences.sql
//   npx wrangler d1 execute mogiri --remote --env production --file=conferences.sql
//   （表示された Secret を npx wrangler secret put PRETIX_KEY_... --env production で設定）

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { allowedPretixOrigins, validateConference } from '../src/commands.js';

export const sql = value => value == null ? 'NULL' : `'${String(value).replace(/'/g, '\'\'')}'`;

export function secretNameFor(conferenceName) {
    return 'PRETIX_KEY_' + conferenceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

// 戻り値: { statements, secrets, skipped }
export function convertConfig(config, allowedOrigins) {
    const guildOf = {};
    for (const guild of Object.values(config.guilds || {})) {
        for (const name of guild.conferences || []) guildOf[name] = guild.guildId;
    }

    const statements = [];
    const secrets = [];
    const skipped = [];
    for (const [name, c] of Object.entries(config.conferences || {})) {
        if (!c.pretix_private_key) {
            skipped.push(`${name}: Pretix ではない（Eventbrite はサーバーレス版では未対応）`);
            continue;
        }
        const row = {
            name,
            guild_id: guildOf[name],
            discord_role: c.discord_role,
            pretix_base_url: String(c.pretix_base_url || '').replace(/\/+$/, ''),
            pretix_organizer: c.pretix_organizer,
            pretix_event_slug: c.pretix_event_slug,
            pretix_key_secret: secretNameFor(name),
            ordernumber_for_test: c.ordernumber_for_test || null,
        };
        const error = validateConference(row, allowedOrigins);
        if (error) {
            skipped.push(`${name}: ${error}`);
            continue;
        }
        const columns = Object.keys(row);
        statements.push(`INSERT OR REPLACE INTO conferences (${columns.join(', ')}) VALUES (${columns.map(k => sql(row[k])).join(', ')});`);
        secrets.push(row.pretix_key_secret);
    }
    return { statements, secrets, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const path = process.argv[2];
    if (!path) {
        console.error('usage: node scripts/import-config.mjs <config.json>');
        process.exit(1);
    }
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const { statements, secrets, skipped } = convertConfig(config, allowedPretixOrigins(process.env));
    console.log(statements.join('\n'));
    for (const s of skipped) console.error(`skipped ${s}`);
    if (secrets.length) {
        console.error('\n次の Secret を設定してください（値は config.json の pretix_private_key）:');
        for (const s of secrets) console.error(`  npx wrangler secret put ${s} --env production`);
    }
}
