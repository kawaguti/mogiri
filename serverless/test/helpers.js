// テスト用の道具: node:sqlite で D1 の代わりをする、Ed25519 で署名したリクエストを作る、Discord の偽物

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

// D1 の API（prepare/bind/first/all/run/batch）のうち、このアプリが使う分だけを再現する
export function createTestD1() {
    const db = new DatabaseSync(':memory:');
    db.exec(SCHEMA);
    const statement = (query, params = []) => ({
        bind: (...args) => statement(query, args),
        first: async () => db.prepare(query).get(...params) ?? null,
        all: async () => ({ results: db.prepare(query).all(...params) }),
        run: async () => ({ meta: { changes: Number(db.prepare(query).run(...params).changes) } }),
        exec: () => {
            const s = db.prepare(query);
            return s.columns().length ? { results: s.all(...params) } : { results: [], meta: { changes: Number(s.run(...params).changes) } };
        },
    });
    return {
        raw: db,
        prepare: query => statement(query),
        async batch(statements) {
            db.exec('BEGIN');
            try {
                const results = statements.map(s => s.exec());
                db.exec('COMMIT');
                return results;
            }
            catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
    };
}

const encoder = new TextEncoder();
const toHex = bytes => Buffer.from(bytes).toString('hex');

export async function createSigner() {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const publicKeyHex = toHex(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)));
    async function signedRequest(body, { timestamp = String(Math.floor(Date.now() / 1000)), tamper } = {}) {
        const text = typeof body === 'string' ? body : JSON.stringify(body);
        const signature = toHex(new Uint8Array(await crypto.subtle.sign('Ed25519', keyPair.privateKey, encoder.encode(timestamp + text))));
        return new Request('https://mogiri.example.workers.dev/', {
            method: 'POST',
            headers: { 'X-Signature-Ed25519': signature, 'X-Signature-Timestamp': timestamp, 'Content-Type': 'application/json' },
            body: tamper ? tamper(text) : text,
        });
    }
    return { publicKeyHex, signedRequest };
}

// 呼ばれた操作を記録するだけの Discord REST クライアント
export function createFakeDiscord({ roles = [] } = {}) {
    const calls = [];
    return {
        calls,
        messages: () => calls.filter(c => c[0] === 'sendMessage').map(c => c[2]),
        edits: () => calls.filter(c => c[0] === 'editOriginalResponse').map(c => c[3]),
        getGuildRoles: async guildId => {
            calls.push(['getGuildRoles', guildId]);
            return roles;
        },
        addMemberRole: async (...args) => {
            calls.push(['addMemberRole', ...args]);
        },
        sendMessage: async (...args) => {
            calls.push(['sendMessage', ...args]);
        },
        editOriginalResponse: async (...args) => {
            calls.push(['editOriginalResponse', ...args]);
        },
        setGuildCommands: async (...args) => {
            calls.push(['setGuildCommands', ...args]);
        },
    };
}

// ctx.waitUntil に渡された処理を最後まで待てるようにする
export function createCtx() {
    const pending = [];
    return {
        waitUntil: p => pending.push(p),
        settle: () => Promise.all(pending),
    };
}

export const GUILD_ID = '111111111111111111';
export const OTHER_GUILD_ID = '222222222222222222';
export const CHANNEL_ID = '333333333333333333';
export const USER_ID = '444444444444444444';
export const ROLE_ID = '555555555555555555';

export function commandInteraction(name, { options, guildId = GUILD_ID, userId = USER_ID, memberRoles = [] } = {}) {
    return {
        type: 2,
        application_id: '999999999999999999',
        token: 'interaction-token',
        guild_id: guildId,
        channel_id: CHANNEL_ID,
        member: { user: { id: userId }, roles: memberRoles },
        data: { name, options },
    };
}
