// wrangler deploy の前に、デプロイ先の Cloudflare アカウントが指定されているかを確かめる。
// wrangler.toml の D1 は database_name だけなので、アカウントを取り違えると
// wrangler deploy がそのアカウントに空の D1 を黙って作り、受付の記録が空になる。
//
// 使い方（serverless/ で）:
//   npm run deploy               … テスト用（mogiri-test）
//   npm run deploy:production    … 本番（mogiri）
// アカウント ID は serverless/.env（本番だけ別のアカウントなら .env.production）に
//   CLOUDFLARE_ACCOUNT_ID=<アカウント ID>
// と書く。wrangler もこのファイルを読む。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const target = process.argv[2] ?? 'test';
if (target !== 'test' && target !== 'production') {
    console.error(`mogiri: unknown target "${target}" (test or production)`);
    process.exit(1);
}

// wrangler と同じく、環境変数 > .env.production.local > .env.production > .env.local > .env の順で優先する。
// loadEnvFile はすでにある値を上書きしないので、優先するファイルから読む
const files = [...(target === 'production' ? ['.env.production.local', '.env.production'] : []), '.env.local', '.env'];
for (const file of files) {
    if (existsSync(file)) process.loadEnvFile(file);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!accountId) {
    console.error('mogiri: CLOUDFLARE_ACCOUNT_ID が指定されていません。serverless/.env に CLOUDFLARE_ACCOUNT_ID=<アカウント ID> を書いてください。');
    console.error('        アカウント ID は npx wrangler whoami で確かめられます。');
    process.exit(1);
}
console.log(`mogiri: deploying ${target === 'production' ? 'mogiri (production)' : 'mogiri-test'} to account ${accountId}`);

const wrangler = path.join(path.dirname(createRequire(import.meta.url).resolve('wrangler/package.json')), 'bin', 'wrangler.js');
const envArgs = target === 'production' ? ['--env', 'production'] : ['--env', ''];
const result = spawnSync(process.execPath, [wrangler, 'deploy', ...envArgs, ...process.argv.slice(3)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
