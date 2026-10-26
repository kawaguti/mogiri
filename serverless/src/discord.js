// Discord REST API の薄いラッパー。discord.js は使わず fetch だけで呼ぶ。

export const API_BASE = 'https://discord.com/api/v10';

// 投稿内容には利用者の入力（注文番号など）が入るので、@everyone などのメンションは常に無効にする
const NO_MENTIONS = { parse: [] };

// Discord が応答しないときに Worker の持ち時間を使い切らないよう、1回の呼び出しを打ち切る時間
const REQUEST_TIMEOUT_MS = 8000;

export class DiscordApiError extends Error {
    constructor(method, path, status, body) {
        super(`Discord API ${method} ${path} failed: ${status} ${body}`);
        this.status = status;
    }
}

export function createDiscordClient({ token, fetch = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
    async function request(method, path, body, { auth = true } = {}) {
        const headers = { 'User-Agent': 'DiscordBot (https://github.com/kawaguti/mogiri, 3.0.0)' };
        if (auth) headers.Authorization = `Bot ${token}`;
        if (body !== undefined) headers['Content-Type'] = 'application/json';

        // レート制限（429）にかかったら一度だけ待って再送する
        for (let attempt = 0; ; attempt++) {
            const res = await fetch(API_BASE + path, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (res.status === 429 && attempt === 0) {
                const data = await res.json().catch(() => ({}));
                await sleep(Math.min((data.retry_after ?? 1) * 1000, 5000));
                continue;
            }
            if (!res.ok) {
                throw new DiscordApiError(method, path, res.status, await res.text().catch(() => ''));
            }
            return res.status === 204 ? null : res.json();
        }
    }

    return {
        getGuildRoles: guildId => request('GET', `/guilds/${guildId}/roles`),
        addMemberRole: (guildId, userId, roleId) =>
            request('PUT', `/guilds/${guildId}/members/${userId}/roles/${roleId}`),
        sendMessage: (channelId, content) =>
            request('POST', `/channels/${channelId}/messages`, { content, allowed_mentions: NO_MENTIONS }),
        // deferred 応答（type 5）で出した「考え中…」を結果に書き換える。interaction token で認証するので Bot トークンは不要
        editOriginalResponse: (applicationId, interactionToken, content) =>
            request('PATCH', `/webhooks/${applicationId}/${interactionToken}/messages/@original`,
                { content, allowed_mentions: NO_MENTIONS }, { auth: false }),
        setGuildCommands: (applicationId, guildId, commands) =>
            request('PUT', `/applications/${applicationId}/guilds/${guildId}/commands`, commands),
        upsertGuildCommand: (applicationId, guildId, command) =>
            request('POST', `/applications/${applicationId}/guilds/${guildId}/commands`, command),
        getChannelMessages: (channelId, before) =>
            request('GET', `/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ''}`),
    };
}
