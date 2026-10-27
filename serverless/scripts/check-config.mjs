// config.json がサーバーレス版に移せるかを確かめる。設定の値やキーは出力せず、カンファレンス名と可否だけを表示する。
//
// 使い方:
//   node scripts/check-config.mjs ../config.json

import { readFileSync } from 'node:fs';
import { allowedPretixOrigins } from '../src/commands.js';
import { convertConfig } from './import-config.mjs';

const ORDER_CODE_PATTERN = /^[A-Za-z0-9]{1,32}$/;

const path = process.argv[2];
if (!path) {
    console.error('usage: node scripts/check-config.mjs <config.json>');
    process.exit(1);
}
const config = JSON.parse(readFileSync(path, 'utf8'));
const { statements, skipped } = convertConfig(config, allowedPretixOrigins(process.env));
const imported = new Set(statements.map(s => /VALUES \('([^']+)'/.exec(s)?.[1]));

let problems = 0;
for (const [name, c] of Object.entries(config.conferences || {})) {
    const notes = [];
    if (!imported.has(name)) notes.push('not importable');
    if (!c.ordernumber_for_test) notes.push('no ordernumber_for_test');
    else if (!ORDER_CODE_PATTERN.test(String(c.ordernumber_for_test))) notes.push('ordernumber_for_test fails the order code format');
    if (notes.length) problems++;
    console.log(`${notes.length ? 'NG' : 'OK'} ${name}${notes.length ? ' - ' + notes.join(', ') : ''}`);
}
// skipped には理由の文が入る（値は含まない）
for (const s of skipped) console.log(`   skipped: ${s}`);
console.log(`${Object.keys(config.conferences || {}).length} conferences, ${statements.length} importable, ${problems} with problems`);
process.exitCode = problems ? 1 : 0;
