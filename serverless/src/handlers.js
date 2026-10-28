// インタラクション（スラッシュコマンド）ごとの処理。
// Discord には3秒以内に応答を返す必要があるため、外部 API を呼ぶ処理は deferred 応答（type 5）を返してから
// work() で続きを行い、終わったら元の応答を書き換える。

import { allowedPretixOrigins, DEFAULT_PRETIX_BASE_URL, guildCommands, validateConference } from './commands.js';
import { DiscordApiError } from './discord.js';

export const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
export const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5 };
const EPHEMERAL = 1 << 6;
const MAX_CONTENT = 2000;
const DEFAULT_MOGIRI_RESPONSE = 'mogiri（サーバーレス版）です。/<カンファレンス名> ordernumber:<注文番号> で受付できます。';

const ephemeral = content => ({ type: ResponseType.CHANNEL_MESSAGE, data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } } });
const deferred = ({ hidden = false } = {}) => ({ type: ResponseType.DEFERRED_CHANNEL_MESSAGE, data: hidden ? { flags: EPHEMERAL } : {} });

function getOption(options, name) {
    return (options || []).find(o => o.name === name)?.value;
}

// 利用者の入力をそのまま投稿に含めるときは長さを抑える（メンションは src/discord.js で無効化済み）
function displayInput(value) {
    const s = String(value ?? '');
    return s.length > 64 ? s.slice(0, 64) + '…' : s;
}

// 参加者が入力した注文番号を Pretix の形（半角英大文字と数字）に寄せる。
// 日本語入力のままの全角（ＺＬ７ＵＷ）、小文字、メールからコピーした先頭の # や前後の空白を許す。
// Pretix の注文番号は大文字なので、大文字にしても別の注文と取り違えることはない。
export function normalizeOrderNumber(value) {
    return String(value ?? '').normalize('NFKC').trim().replace(/^#+\s*/, '').toUpperCase();
}

function formatJst(iso) {
    const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// D1 の行に、Secret から Pretix トークンを足して src/pretix.js が期待する形にする
export function withPretixKey(conference, env) {
    const secretName = conference.pretix_key_secret;
    const key = /^PRETIX_KEY_[A-Z0-9_]+$/.test(secretName || '') ? env[secretName] : undefined;
    return { ...conference, pretix_private_key: key };
}

// 受付コマンドの試行回数の上限（既定: 10分に5回まで）。環境変数で変えられる
export function attemptLimit(env) {
    const toPositiveInt = (value, fallback) => {
        const n = Number(value);
        return Number.isInteger(n) && n > 0 ? n : fallback;
    };
    return {
        maxAttempts: toPositiveInt(env.CHECKIN_MAX_ATTEMPTS, 5),
        windowSeconds: toPositiveInt(env.CHECKIN_ATTEMPT_WINDOW_SECONDS, 600),
    };
}

function isAdmin(interaction, env) {
    const ids = (env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    return ids.includes(interaction.member?.user?.id);
}

// 戻り値: { response, work? }。work があれば応答を返したあとに実行し、その戻り値（文字列）で応答を書き換える
export function routeInteraction(interaction, deps) {
    if (interaction.type === InteractionType.PING) {
        return { response: { type: ResponseType.PONG } };
    }
    if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
        return { response: ephemeral('この操作には対応していません。') };
    }

    const name = interaction.data?.name;
    if (name === 'mogiri') {
        return { response: { type: ResponseType.CHANNEL_MESSAGE, data: { content: deps.env.MOGIRI_RESPONSE || DEFAULT_MOGIRI_RESPONSE, allowed_mentions: { parse: [] } } } };
    }
    if (!interaction.guild_id || !interaction.member) {
        return { response: ephemeral('サーバー内のチャンネルで実行してください。') };
    }
    if (name === 'mogiri-check') {
        return { response: deferred(), work: () => runMogiriCheck(interaction, deps) };
    }
    if (name === 'mogiri-admin') {
        if (!isAdmin(interaction, deps.env)) {
            return { response: ephemeral('このコマンドは mogiri の運営者だけが使えます。') };
        }
        return { response: deferred({ hidden: true }), work: () => runAdmin(interaction, deps) };
    }
    // それ以外はカンファレンスのコマンドとして扱う（D1 を引くのは応答を返したあと）。
    // 注文番号は本人だけが知るべき情報なので、応答は本人にだけ見せる。
    return { response: deferred({ hidden: true }), work: () => runCheckin(interaction, deps) };
}

export async function runDeferred(interaction, work, deps) {
    let content;
    try {
        content = await work();
    } catch (error) {
        console.error('mogiri: deferred work failed:', error.stack || error.message);
        content = 'エラーが発生しました。少し待ってからもう一度試すか、受付スタッフに声をかけてください。';
    }
    try {
        await deps.discord.editOriginalResponse(interaction.application_id, interaction.token, content.slice(0, MAX_CONTENT));
    } catch (error) {
        console.error('mogiri: failed to edit original response:', error.message);
    }
}

export async function runCheckin(interaction, { env, store, discord, checkPretixOrder }) {
    const conferenceName = interaction.data.name;
    const guildId = interaction.guild_id;
    const channelId = interaction.channel_id ?? interaction.channel?.id;
    const userId = interaction.member.user.id;
    const ordernumber = normalizeOrderNumber(getOption(interaction.data.options, 'ordernumber'));

    const row = await store.getConference(conferenceName);
    if (!row || row.guild_id !== guildId) {
        return `${displayInput(conferenceName)} はこのサーバーで受付中のカンファレンスではありません。`;
    }
    const conference = withPretixKey(row, env);

    // check roles
    const roles = await discord.getGuildRoles(guildId);
    const role = roles.find(r => r.name === conference.discord_role);
    if (!role) {
        // no suitable roles in this server
        return conference.discord_role + 'のロールがサーバー上に見つかりませんでした。チケット購入時のメールに記載されているサーバーにアクセスしてコマンドを試してください。';
    }
    else if ((interaction.member.roles || []).includes(role.id)) {
        // already have the role
        return 'すでに' + role.name + 'のロールをお持ちでした！';
    }

    if (!conference.pretix_private_key) {
        console.error(`mogiri: secret ${conference.pretix_key_secret} is not set for ${conferenceName}`);
        return '設定に誤りがあり確認できませんでした。受付スタッフに声をかけてください。';
    }

    // 注文番号の総当たりで Pretix の API 制限を使い切られないよう、Pretix に問い合わせる前に回数を数える
    const { maxAttempts, windowSeconds } = attemptLimit(env);
    if (!await store.recordAttempt(userId, windowSeconds, maxAttempts)) {
        console.warn(`mogiri: attempt limit exceeded by user ${userId} (${maxAttempts} in ${windowSeconds}s)`);
        return `確認の回数が上限（${Math.round(windowSeconds / 60)}分間に${maxAttempts}回）に達しました。しばらく待ってから試すか、受付スタッフに声をかけてください。`;
    }

    // 受付チャンネルへの投稿には注文番号を書かない（番号は D1 にだけ残す）。
    // <@id> は名前の表示だけで、allowed_mentions で通知は止めている。
    const tag = ` [${conferenceName}]`;
    const result = await checkPretixOrder(ordernumber, conference);
    if (result.isValid) {
        // ロールを付けられたときだけチェックインとして記録する（失敗した試行で枚数が増えないように）
        try {
            await discord.addMemberRole(guildId, userId, role.id);
        }
        catch (error) {
            if (error instanceof DiscordApiError && error.status === 403) {
                console.error(`mogiri: cannot add role ${role.name} in guild ${guildId}: ${error.message}`);
                return '注文は確認できましたが、ロールを付けられませんでした（Bot の権限かロールの順番の問題です）。受付スタッフに声をかけてください。';
            }
            throw error;
        }
        const usage = await store.recordCheckin({ guildId, conference: conferenceName, orderNumber: ordernumber, userId });
        const ticketInfo = result.ticketCount > 0 ? ` (${usage}/${result.ticketCount}枚目)` : '';
        await postRecord(discord, channelId, `<@${userId}> のチェックインを確認し、${role.name}のロールをつけました！${tag}${ticketInfo}`);
        return 'Pretixでの認証が完了しました。' + role.name + 'のロールをつけました！';
    }
    if (result.reason === 'no_admission') {
        await postRecord(discord, channelId, `<@${userId}> の注文は入場券ではないため、参加者ロールを付与できませんでした。${tag}`);
        return 'このオーダー番号は入場券ではないため、Pretixでの認証に失敗しました。';
    }
    await postRecord(discord, channelId, `<@${userId}> の注文番号を確認できませんでした。${tag}`);
    return displayInput(ordernumber) + 'は有効なPretixオーダー番号ではありませんでした。番号を確かめてもう一度試してください。';
}

// 受付チャンネルへの投稿はスタッフ向けの記録なので、失敗しても本人への結果は変えない。
// Discord の応答が遅く、投稿はできたのにタイムアウトになることもある（その場合も本人には「完了」と出す）。
async function postRecord(discord, channelId, content) {
    try {
        await discord.sendMessage(channelId, content);
    }
    catch (error) {
        console.error(`mogiri: failed to post the check-in record to channel ${channelId}: ${error.name}: ${error.message}`);
    }
}

export async function runMogiriCheck(interaction, { env, store, discord, checkPretixOrder }) {
    const guildId = interaction.guild_id;
    const channelId = interaction.channel_id ?? interaction.channel?.id;
    const memberRoles = interaction.member.roles || [];

    const [conferences, stats, roles] = await Promise.all([
        store.listConferences(guildId), store.checkinStats(guildId), discord.getGuildRoles(guildId),
    ]);

    const header = ['━━━━━━━━━━━━━━━━━━━━━━', '📊 チェックイン記録の確認 (D1)', `記録: ${stats?.total ?? 0}件`];
    if (stats?.oldest_at) header.push(`🕐 最古のチェックイン: ${formatJst(stats.oldest_at)}`);
    if (conferences.length === 0) header.push('ℹ️ このサーバーにはカンファレンスが登録されていません（/mogiri-admin add で追加）');
    header.push('━━━━━━━━━━━━━━━━━━━━━━');
    await discord.sendMessage(channelId, header.join('\n'));

    for (const row of conferences) {
        const conference = withPretixKey(row, env);
        const lines = ['testing with conference : ' + conference.name];
        const role = roles.find(r => r.name === conference.discord_role);
        lines.push(conference.discord_role + (role ? 'のロールがサーバー上に見つかりました' : 'のロールがサーバー上に見つかりませんでした'));
        lines.push(conference.discord_role + (role && memberRoles.includes(role.id) ? 'のロールをお持ちでした！' : 'のロールをお持ちではありませんでした！'));

        if (!conference.pretix_private_key) {
            lines.push(`⚠️ Secret \`${conference.pretix_key_secret}\` が設定されていません`);
        }
        else if (!conference.ordernumber_for_test) {
            lines.push('ℹ️ テスト用の注文番号が未設定のため、Pretix の確認は省略しました');
        }
        else {
            // テスト用の注文番号もチャンネルには出さない
            const result = await checkPretixOrder(conference.ordernumber_for_test, conference);
            if (result.isValid) {
                lines.push('テスト用の注文番号は有効なPretixオーダー番号です。');
                if (result.ticketCount > 0) lines.push(`🎫 チケット枚数: ${result.ticketCount}枚`);
            }
            else {
                lines.push(`テスト用の注文番号は有効なPretixオーダー番号ではありませんでした。(${result.reason})`);
            }
        }
        await discord.sendMessage(channelId, lines.join('\n').slice(0, MAX_CONTENT));
    }
    return 'mogiri-check';
}

// 参加者からの問い合わせに答えるため、その人の受付の記録・参加者ロールの有無・直近の試行回数をまとめる。
// 返信は実行した管理者にだけ見えるので、注文番号も出す。
async function runWhois(userId, interaction, { env, store, discord }) {
    if (!/^\d{1,20}$/.test(userId || '')) return '❌ user を指定してください。';
    const guildId = interaction.guild_id;
    const { maxAttempts, windowSeconds } = attemptLimit(env);
    const [conferences, records, roles, attempts] = await Promise.all([
        store.listConferences(guildId), store.userCheckins(guildId, userId),
        discord.getGuildRoles(guildId), store.countRecentAttempts(userId, windowSeconds),
    ]);
    // ユーザーを選ぶ入力では、選んだメンバーのロールが resolved に入ってくる
    const member = interaction.data.resolved?.members?.[userId];

    const lines = [`👤 <@${userId}>（\`${userId}\`）`];
    if (!member) lines.push('⚠️ このサーバーのメンバーではありません');

    lines.push('', '**受付の記録**');
    if (records.length === 0) lines.push('このサーバーでの記録はありません');
    for (const r of records) {
        lines.push(`• /${r.conference} ${formatJst(r.created_at)} 注文 \`${r.order_number}\`（${r.nth}枚目）`);
    }

    // 記録があるか、ロールを持っているカンファレンスだけ並べる
    const recorded = new Set(records.map(r => r.conference));
    const roleLines = conferences.flatMap(c => {
        const role = roles.find(x => x.name === c.discord_role);
        const has = Boolean(role && member?.roles?.includes(role.id));
        if (!has && !recorded.has(c.name)) return [];
        return [`• /${c.name} 「${c.discord_role}」: ${role ? (has ? 'あり' : 'なし') : 'ロールがサーバーにない'}`];
    });
    lines.push('', '**参加者ロール**', ...(roleLines.length ? roleLines : ['どの参加者ロールも持っていません']));

    lines.push('', `**受付の試行**（直近 ${Math.round(windowSeconds / 60)} 分）: ${attempts}回 / 上限 ${maxAttempts}回`);
    if (attempts >= maxAttempts) lines.push('⚠️ 上限に達しています。いちばん古い試行から時間がたつと、また試せます');

    lines.push('', 'ℹ️ サーバーレス版に切り替える前（2026-10-27 より前）の受付は、だれが受付したかが記録されていないため出ません。');
    return lines.join('\n').slice(0, MAX_CONTENT);
}

const PRETIX_REASONS = {
    invalid_format: '注文番号の形式が正しくない',
    api_error: '見つからない（または Pretix に接続できない）',
    not_paid_or_canceled: '未払いかキャンセル済み',
    no_admission: '入場券を含まない',
};

// 注文番号から、だれがいつ受付したかと、Pretix での状態（入場券の枚数）をまとめる。
// Pretix には、記録のあるカンファレンス（記録がなければ name で指定した1つ）にだけ問い合わせる。
async function runOrder(number, name, guildId, { env, store, checkPretixOrder }) {
    const order = normalizeOrderNumber(number);
    if (!/^[A-Z0-9]{1,32}$/.test(order)) return '❌ 注文番号の形式が正しくありません（英数字のみ）。';
    const [conferences, records] = await Promise.all([store.listConferences(guildId), store.orderCheckins(guildId, order)]);

    const names = [...new Set(records.map(r => r.conference))];
    if (names.length === 0) {
        if (!name) return `🎫 注文 \`${order}\`\nこのサーバーでの受付の記録はありません。\nℹ️ \`name\` を指定すると、そのカンファレンスの Pretix で注文を確かめます。`;
        names.push(name);
    }

    const lines = [`🎫 注文 \`${order}\``];
    for (const conferenceName of names) {
        const rows = records.filter(r => r.conference === conferenceName);
        const conference = conferences.find(c => c.name === conferenceName);
        lines.push('', `**/${conferenceName}**（受付 ${rows.length}回）`);
        if (!conference) {
            lines.push(rows.length ? 'ℹ️ このカンファレンスは、いまは登録されていないため Pretix では確かめません' : `❌ ${displayInput(conferenceName)} はこのサーバーに登録されていません。`);
        }
        else {
            const withKey = withPretixKey(conference, env);
            if (!withKey.pretix_private_key) {
                lines.push(`⚠️ Secret \`${conference.pretix_key_secret}\` が設定されていないため、Pretix では確かめません`);
            }
            else {
                const result = await checkPretixOrder(order, withKey);
                if (!result.isValid) lines.push(`Pretix: ${PRETIX_REASONS[result.reason] ?? result.reason}`);
                else {
                    const over = rows.length - result.ticketCount;
                    lines.push(`Pretix: 有効・入場券 ${result.ticketCount}枚${over > 0 ? `（⚠️ ${over}回多く受付されている）` : ''}`);
                }
            }
        }
        rows.forEach((r, i) => {
            lines.push(`• ${i + 1}枚目 ${formatJst(r.created_at)} ${r.user_id ? `<@${r.user_id}>` : '（だれが受付したかの記録なし）'}`);
        });
    }
    return lines.join('\n').slice(0, MAX_CONTENT);
}

// 日本時間の今日の 0 時を、D1 の created_at と比べられる UTC の文字列で返す
function startOfTodayJst(now = Date.now()) {
    const jst = new Date(now + 9 * 60 * 60 * 1000);
    return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - 9 * 60 * 60 * 1000).toISOString();
}

// 受付枚数を数える。Pretix は name を指定したカンファレンス1つにだけ問い合わせる
// （全カンファレンスに問い合わせると、Workers の1リクエストあたりの外部問い合わせの上限に近づくため）。
async function runAnalytics(name, guildId, { env, store, countPaidAdmissions }) {
    const conferences = await store.listConferences(guildId);
    const counts = new Map((await store.checkinCounts(guildId, startOfTodayJst())).map(r => [r.conference, r]));
    const line = c => {
        const r = counts.get(c.name);
        return `受付 ${r?.total ?? 0}枚（注文 ${r?.orders ?? 0}件）・今日 ${r?.since_count ?? 0}枚`;
    };

    if (!name) {
        if (conferences.length === 0) return 'このサーバーにはカンファレンスが登録されていません。';
        return [
            ...conferences.map(c => `• /${c.name} … ${line(c)}`),
            'ℹ️ `name` を指定すると、Pretix の販売枚数と並べて表示します。',
        ].join('\n').slice(0, MAX_CONTENT);
    }

    const conference = conferences.find(c => c.name === name);
    if (!conference) return `❌ ${displayInput(name)} はこのサーバーに登録されていません。`;
    const lines = [`📊 /${conference.name}`, line(conference)];
    const withKey = withPretixKey(conference, env);
    if (!withKey.pretix_private_key) {
        lines.push(`⚠️ Secret \`${conference.pretix_key_secret}\` が設定されていないため、販売枚数を取得できません`);
    }
    else {
        const sold = await countPaidAdmissions(withKey);
        const checkedIn = counts.get(conference.name)?.total ?? 0;
        if (sold === null) lines.push('⚠️ Pretix から販売枚数を取得できませんでした');
        else lines.push(`販売 ${sold}枚（支払い済みの入場券）${sold > 0 ? `・受付率 ${Math.round(checkedIn / sold * 100)}%` : ''}`);
    }
    return lines.join('\n');
}

async function syncCommands(interaction, { store, discord }) {
    const conferences = await store.listConferences(interaction.guild_id);
    await discord.setGuildCommands(interaction.application_id, interaction.guild_id, guildCommands(conferences));
    return conferences;
}

export async function runAdmin(interaction, deps) {
    const { env, store } = deps;
    const sub = interaction.data.options?.[0];
    const guildId = interaction.guild_id;

    if (sub?.name === 'list') {
        const conferences = await store.listConferences(guildId);
        if (conferences.length === 0) return 'このサーバーにはカンファレンスが登録されていません。';
        return conferences.map(c =>
            `• /${c.name} → ロール「${c.discord_role}」 <${c.pretix_base_url.replace(/\/+$/, '')}/${c.pretix_organizer}/${c.pretix_event_slug}/> (\`${c.pretix_key_secret}\`${env[c.pretix_key_secret] ? '' : ' ⚠️未設定'})`,
        ).join('\n');
    }

    if (sub?.name === 'add') {
        const opt = name => getOption(sub.options, name);
        const conference = {
            name: opt('name'),
            guild_id: guildId,
            discord_role: opt('role'),
            pretix_base_url: (opt('base_url') || DEFAULT_PRETIX_BASE_URL).replace(/\/+$/, ''),
            pretix_organizer: opt('organizer'),
            pretix_event_slug: opt('event'),
            pretix_key_secret: opt('key_secret'),
            // 受付と同じく、全角・小文字・先頭の # を直してから確かめる
            ordernumber_for_test: normalizeOrderNumber(opt('test_order')) || null,
        };
        const error = validateConference(conference, allowedPretixOrigins(env));
        if (error) return '❌ ' + error;

        const existing = await store.getConference(conference.name);
        if (existing && existing.guild_id !== guildId) {
            return `❌ ${conference.name} は別のサーバーで使われています。`;
        }
        await store.upsertConference(conference);
        const conferences = await syncCommands(interaction, deps);
        const warning = env[conference.pretix_key_secret] ? '' : `\n⚠️ Secret \`${conference.pretix_key_secret}\` がまだ設定されていません。\`npx wrangler secret put ${conference.pretix_key_secret}\`（本番は \`--env production\` を付ける）で設定してください。`;
        return `✅ /${conference.name} を${existing ? '更新' : '追加'}しました（このサーバーのカンファレンス: ${conferences.length}件）。${warning}`;
    }

    if (sub?.name === 'remove') {
        const name = getOption(sub.options, 'name');
        const deleted = await store.deleteConference(name, guildId);
        if (!deleted) return `❌ ${displayInput(name)} はこのサーバーに登録されていません。`;
        await syncCommands(interaction, deps);
        return `✅ /${name} を削除しました（チェックインの記録は残っています）。`;
    }

    if (sub?.name === 'sync') {
        const conferences = await syncCommands(interaction, deps);
        return `✅ コマンドを登録し直しました（カンファレンス ${conferences.length}件）。`;
    }

    if (sub?.name === 'whois') {
        return runWhois(getOption(sub.options, 'user'), interaction, deps);
    }

    if (sub?.name === 'order') {
        return runOrder(getOption(sub.options, 'number'), getOption(sub.options, 'name'), guildId, deps);
    }

    if (sub?.name === 'analytics') {
        return runAnalytics(getOption(sub.options, 'name'), guildId, deps);
    }

    return '不明なサブコマンドです。';
}
