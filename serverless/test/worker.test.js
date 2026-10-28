import should from 'should';
import { DiscordApiError } from '../src/discord.js';
import { attemptLimit, normalizeOrderNumber } from '../src/handlers.js';
import { createWorker } from '../src/index.js';
import { createStore } from '../src/store.js';
import {
    CHANNEL_ID, commandInteraction, createCtx, createFakeDiscord, createSigner, createTestD1,
    GUILD_ID, OTHER_GUILD_ID, ROLE_ID, USER_ID,
} from './helpers.js';

const ORDER = 'AB12C';
const TEST_ORDER = 'ZZ99Y';

const RSGT = {
    name: 'rsgt2027',
    guild_id: GUILD_ID,
    discord_role: 'RSGT2027参加者',
    pretix_base_url: 'https://pretix.eu',
    pretix_organizer: 'scrumgathering',
    pretix_event_slug: 'rsgt2027',
    pretix_key_secret: 'PRETIX_KEY_SCRUMGATHERING',
    ordernumber_for_test: TEST_ORDER,
};

describe('serverless worker', function() {
    let signer;
    let env;
    let d1;
    let store;
    let discord;
    let pretixCalls;
    let pretixResult;
    let soldCalls;
    let soldResult;

    before(async function() {
        signer = await createSigner();
    });

    beforeEach(async function() {
        d1 = createTestD1();
        store = createStore(d1);
        await store.upsertConference(RSGT);
        discord = createFakeDiscord({ roles: [{ id: ROLE_ID, name: RSGT.discord_role }] });
        pretixCalls = [];
        pretixResult = { isValid: true, ticketCount: 2, reason: null };
        soldCalls = [];
        soldResult = 8;
        env = {
            DISCORD_PUBLIC_KEY: signer.publicKeyHex,
            PRETIX_KEY_SCRUMGATHERING: 'pretix-secret-token',
            DISCORD_BOT_TOKEN: 'bot-secret-token',
            ADMIN_USER_IDS: USER_ID,
            MOGIRI_RESPONSE: 'hello from mogiri',
        };
    });

    // 署名付きリクエストを Worker に送り、応答と、waitUntil の処理が終わったあとの状態を返す
    async function send(interaction, requestOptions) {
        const worker = createWorker({
            store,
            discord,
            checkPretixOrder: async (order, conference) => {
                pretixCalls.push({ order, conference });
                if (pretixResult instanceof Error) throw pretixResult;
                return pretixResult;
            },
            countPaidAdmissions: async conference => {
                soldCalls.push(conference);
                return soldResult;
            },
        });
        const ctx = createCtx();
        const res = await worker.fetch(await signer.signedRequest(interaction, requestOptions), env, ctx);
        await ctx.settle();
        return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
    }

    const checkin = (options = {}) => commandInteraction('rsgt2027', { options: [{ name: 'ordernumber', type: 3, value: options.order ?? ORDER }], ...options });

    describe('request handling', function() {
        it('answers PING with PONG', async function() {
            const { body } = await send({ type: 1 });
            body.should.eql({ type: 1 });
        });

        it('rejects a request whose body was altered after signing', async function() {
            const { status } = await send({ type: 1 }, { tamper: text => text.replace('1', '2') });
            status.should.equal(401);
        });

        it('rejects a request with an old timestamp', async function() {
            const { status } = await send({ type: 1 }, { timestamp: String(Math.floor(Date.now() / 1000) - 3600) });
            status.should.equal(401);
        });

        it('responds to GET without signature (health check)', async function() {
            const res = await createWorker().fetch(new Request('https://x.example/'), env, createCtx());
            res.status.should.equal(200);
        });

        it('replies /mogiri immediately with the configured text', async function() {
            const { body } = await send(commandInteraction('mogiri'));
            body.type.should.equal(4);
            body.data.content.should.equal('hello from mogiri');
        });

        it('asks to run commands inside a server when invoked from DM', async function() {
            const interaction = commandInteraction('rsgt2027');
            delete interaction.guild_id;
            delete interaction.member;
            const { body } = await send(interaction);
            body.type.should.equal(4);
            body.data.flags.should.equal(64);
        });
    });

    describe('conference check-in', function() {
        it('defers privately, grants the role and posts a record without the order number', async function() {
            const { body } = await send(checkin());
            body.should.eql({ type: 5, data: { flags: 64 } });

            pretixCalls.should.have.length(1);
            pretixCalls[0].order.should.equal(ORDER);
            pretixCalls[0].conference.pretix_private_key.should.equal('pretix-secret-token');
            pretixCalls[0].conference.pretix_event_slug.should.equal('rsgt2027');

            discord.calls.should.containEql(['addMemberRole', GUILD_ID, USER_ID, ROLE_ID]);
            const messages = discord.messages();
            messages.should.have.length(1);
            discord.calls.find(c => c[0] === 'sendMessage')[1].should.equal(CHANNEL_ID);
            messages[0].should.equal(`<@${USER_ID}> のチェックインを確認し、RSGT2027参加者のロールをつけました！ [rsgt2027] (1/2枚目)`);
            messages[0].should.not.containEql(ORDER);
            discord.edits()[0].should.startWith('Pretixでの認証が完了しました。');
        });

        it('counts how many times the same order has been used', async function() {
            await send(checkin());
            await send(checkin({ userId: '777777777777777777' }));
            await send(checkin({ userId: '888888888888888888' }));
            const messages = discord.messages();
            messages[1].should.endWith('(2/2枚目)');
            messages[2].should.endWith('(3/2枚目)');
        });

        it('accepts full-width, lowercase and #-prefixed order numbers as the same order', async function() {
            const variants = ['ＡＢＣ１２', 'abc12', '#ABC12', ' ＃abc12 '];
            for (const [i, order] of variants.entries()) {
                await send(checkin({ order, userId: `77777777777777777${i}` }));
            }
            pretixCalls.map(c => c.order).should.eql(['ABC12', 'ABC12', 'ABC12', 'ABC12']);
            // 入力の書き方が違っても同じ注文として数える
            discord.messages()[3].should.endWith('(4/2枚目)');
        });

        it('does not call Pretix when the member already has the role', async function() {
            await send(checkin({ memberRoles: [ROLE_ID] }));
            pretixCalls.should.have.length(0);
            discord.edits()[0].should.equal('すでにRSGT2027参加者のロールをお持ちでした！');
        });

        it('explains when the role does not exist in the server', async function() {
            discord = createFakeDiscord({ roles: [] });
            await send(checkin());
            pretixCalls.should.have.length(0);
            discord.edits()[0].should.startWith('RSGT2027参加者のロールがサーバー上に見つかりませんでした');
        });

        it('posts a failure record without the order number for an invalid order', async function() {
            pretixResult = { isValid: false, ticketCount: 0, reason: 'api_error' };
            await send(checkin());
            discord.calls.filter(c => c[0] === 'addMemberRole').should.have.length(0);
            discord.messages().should.eql([`<@${USER_ID}> の注文番号を確認できませんでした。 [rsgt2027]`]);
            discord.edits()[0].should.containEql('は有効なPretixオーダー番号ではありませんでした');
        });

        it('rejects orders without an admission ticket', async function() {
            pretixResult = { isValid: false, ticketCount: 0, reason: 'no_admission' };
            await send(checkin());
            discord.calls.filter(c => c[0] === 'addMemberRole').should.have.length(0);
            discord.messages()[0].should.containEql('入場券ではない');
            discord.messages()[0].should.not.containEql(ORDER);
        });

        it('does not accept a conference registered to another server', async function() {
            await send(checkin({ guildId: OTHER_GUILD_ID }));
            pretixCalls.should.have.length(0);
            discord.edits()[0].should.containEql('受付中のカンファレンスではありません');
        });

        it('does not call Pretix when the token secret is missing', async function() {
            delete env.PRETIX_KEY_SCRUMGATHERING;
            await send(checkin());
            pretixCalls.should.have.length(0);
            discord.edits()[0].should.containEql('受付スタッフ');
        });

        it('reports an error to the user when something throws', async function() {
            pretixResult = new Error('network down');
            const originalError = console.error;
            console.error = () => {};
            try {
                await send(checkin());
            }
            finally {
                console.error = originalError;
            }
            discord.edits()[0].should.startWith('エラーが発生しました');
        });
    });

    describe('failures and timing', function() {
        // console.error を黙らせてから実行する
        async function quietly(fn) {
            const originalError = console.error;
            console.error = () => {};
            try {
                return await fn();
            }
            finally {
                console.error = originalError;
            }
        }
        const countCheckins = () => d1.raw.prepare('SELECT COUNT(*) AS n FROM checkins').get().n;

        it('rejects a request without signature headers', async function() {
            const request = new Request('https://x.example/', { method: 'POST', body: JSON.stringify({ type: 1 }) });
            const res = await createWorker().fetch(request, env, createCtx());
            res.status.should.equal(401);
        });

        it('answers an unknown command without calling Pretix', async function() {
            await send(commandInteraction('no-such-conference', { options: [{ name: 'ordernumber', type: 3, value: ORDER }] }));
            pretixCalls.should.have.length(0);
            discord.edits()[0].should.containEql('受付中のカンファレンスではありません');
        });

        it('returns the deferred response before the slow work finishes (3 second rule)', async function() {
            let release;
            const gate = new Promise(resolve => {
                release = resolve;
            });
            const worker = createWorker({
                store,
                discord,
                checkPretixOrder: async () => {
                    await gate;
                    return { isValid: false, ticketCount: 0, reason: 'api_error' };
                },
            });
            const ctx = createCtx();
            const started = Date.now();
            const res = await worker.fetch(await signer.signedRequest(checkin()), env, ctx);
            (Date.now() - started).should.be.below(1000);
            (await res.json()).type.should.equal(5);
            discord.edits().should.have.length(0);
            release();
            await ctx.settle();
            discord.edits().should.have.length(1);
        });

        it('does not record a check-in when the bot lacks permission to add the role', async function() {
            discord.addMemberRole = async () => {
                throw new DiscordApiError('PUT', '/roles', 403, 'Missing Permissions');
            };
            await quietly(() => send(checkin()));
            countCheckins().should.equal(0);
            discord.messages().should.have.length(0);
            discord.edits()[0].should.containEql('ロールを付けられませんでした');
        });

        it('reports a generic error and records nothing when adding the role fails otherwise', async function() {
            discord.addMemberRole = async () => {
                throw new DiscordApiError('PUT', '/roles', 500, 'oops');
            };
            await quietly(() => send(checkin()));
            countCheckins().should.equal(0);
            discord.edits()[0].should.startWith('エラーが発生しました');
        });

        it('keeps working when sending the follow-up fails', async function() {
            discord.editOriginalResponse = async () => {
                throw new DiscordApiError('PATCH', '/webhooks', 404, 'Unknown Webhook');
            };
            const { status } = await quietly(() => send(checkin()));
            status.should.equal(200);
            countCheckins().should.equal(1);
        });

        it('still tells the attendee the check-in succeeded when posting the record times out', async function() {
            // 本番で、投稿は届いたのに Discord の応答が8秒を超えてタイムアウトしたことがある
            discord.sendMessage = async () => {
                throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
            };
            await quietly(() => send(checkin()));
            countCheckins().should.equal(1);
            discord.calls.should.containEql(['addMemberRole', GUILD_ID, USER_ID, ROLE_ID]);
            discord.edits()[0].should.startWith('Pretixでの認証が完了しました。');
        });

        it('still tells the attendee about an invalid order when posting the record fails', async function() {
            pretixResult = { isValid: false, ticketCount: 0, reason: 'api_error' };
            discord.sendMessage = async () => {
                throw new DiscordApiError('POST', '/messages', 403, 'Missing Access');
            };
            await quietly(() => send(checkin()));
            discord.edits()[0].should.containEql('有効なPretixオーダー番号ではありませんでした');
        });
    });

    describe('attempt limit', function() {
        beforeEach(function() {
            pretixResult = { isValid: false, ticketCount: 0, reason: 'api_error' };
        });

        it('stops calling Pretix after 5 attempts in 10 minutes by default', async function() {
            for (let i = 0; i < 6; i++) await send(checkin({ order: `WRONG${i}` }));
            pretixCalls.should.have.length(5);
            discord.edits()[5].should.startWith('確認の回数が上限（10分間に5回）に達しました');
            // 上限に達したことは本人にだけ伝え、チャンネルには投稿しない
            discord.messages().should.have.length(5);
        });

        it('counts attempts per user', async function() {
            env.CHECKIN_MAX_ATTEMPTS = '1';
            await send(checkin());
            await send(checkin());
            await send(checkin({ userId: '777777777777777777' }));
            pretixCalls.map(c => c.order).should.have.length(2);
            discord.edits()[1].should.containEql('上限');
            discord.edits()[2].should.not.containEql('上限');
        });

        it('forgets attempts older than the window', async function() {
            env.CHECKIN_MAX_ATTEMPTS = '2';
            d1.raw.prepare('INSERT INTO checkin_attempts (user_id, created_at) VALUES (?, ?)').run(USER_ID, '2000-01-01T00:00:00.000Z');
            d1.raw.prepare('INSERT INTO checkin_attempts (user_id, created_at) VALUES (?, ?)').run(USER_ID, '2000-01-01T00:00:01.000Z');
            await send(checkin());
            pretixCalls.should.have.length(1);
            // 古い記録は消えている
            d1.raw.prepare('SELECT COUNT(*) AS n FROM checkin_attempts').get().n.should.equal(1);
        });

        it('does not record attempts that were stopped by the limit', async function() {
            env.CHECKIN_MAX_ATTEMPTS = '2';
            for (let i = 0; i < 5; i++) await send(checkin({ order: `WRONG${i}` }));
            pretixCalls.should.have.length(2);
            // 止められた3回は数えないので、待ち時間は最初の2回の時刻だけで決まる
            d1.raw.prepare('SELECT COUNT(*) AS n FROM checkin_attempts').get().n.should.equal(2);
            // 最初の2回が窓の外に出れば、また試せる
            d1.raw.prepare(`UPDATE checkin_attempts SET created_at = '2000-01-01T00:00:00.000Z'`).run();
            await send(checkin({ order: 'WRONG5' }));
            pretixCalls.should.have.length(3);
        });

        it('does not count users who already have the role', async function() {
            env.CHECKIN_MAX_ATTEMPTS = '1';
            for (let i = 0; i < 3; i++) await send(checkin({ memberRoles: [ROLE_ID] }));
            d1.raw.prepare('SELECT COUNT(*) AS n FROM checkin_attempts').get().n.should.equal(0);
        });

        it('falls back to defaults for invalid settings', function() {
            attemptLimit({}).should.eql({ maxAttempts: 5, windowSeconds: 600 });
            attemptLimit({ CHECKIN_MAX_ATTEMPTS: 'abc', CHECKIN_ATTEMPT_WINDOW_SECONDS: '-1' }).should.eql({ maxAttempts: 5, windowSeconds: 600 });
            attemptLimit({ CHECKIN_MAX_ATTEMPTS: '3', CHECKIN_ATTEMPT_WINDOW_SECONDS: '300' }).should.eql({ maxAttempts: 3, windowSeconds: 300 });
        });
    });

    describe('normalizeOrderNumber', function() {
        it('turns full-width, lowercase, # and surrounding spaces into the Pretix form', function() {
            normalizeOrderNumber('ＺＬ７ＵＷ').should.equal('ZL7UW');
            normalizeOrderNumber('zl7uw').should.equal('ZL7UW');
            normalizeOrderNumber('#ZL7UW').should.equal('ZL7UW');
            normalizeOrderNumber('＃ ｚｌ７ｕｗ').should.equal('ZL7UW');
            normalizeOrderNumber('　ZL7UW　').should.equal('ZL7UW');
            normalizeOrderNumber(undefined).should.equal('');
        });

        it('leaves other mistakes for the order code check to reject', function() {
            normalizeOrderNumber('ZL7UW.').should.equal('ZL7UW.');
            normalizeOrderNumber('ZL 7UW').should.equal('ZL 7UW');
        });
    });

    describe('/mogiri-check', function() {
        it('posts the status without the test order number', async function() {
            await send(commandInteraction('mogiri-check', { memberRoles: [ROLE_ID] }));
            pretixCalls[0].order.should.equal(TEST_ORDER);
            const text = discord.messages().join('\n');
            text.should.containEql('testing with conference : rsgt2027');
            text.should.containEql('のロールをお持ちでした！');
            text.should.containEql('🎫 チケット枚数: 2枚');
            text.should.not.containEql(TEST_ORDER);
            discord.edits().should.eql(['mogiri-check']);
        });
    });

    describe('/mogiri-admin', function() {
        const admin = (sub, options = [], interactionOptions = {}) =>
            commandInteraction('mogiri-admin', { options: [{ type: 1, name: sub, options }], ...interactionOptions });
        const addOptions = overrides => Object.entries({
            name: 'scrumfest-osaka-2027', role: 'SFO2027参加者', organizer: 'scrumfest', event: 'sfo2027', key_secret: 'PRETIX_KEY_SCRUMFEST', ...overrides,
        }).map(([name, value]) => ({ name, type: 3, value }));

        it('refuses users not listed in ADMIN_USER_IDS', async function() {
            const { body } = await send(admin('list', [], { userId: '777777777777777777' }));
            body.type.should.equal(4);
            body.data.content.should.containEql('運営者だけ');
        });

        it('adds a conference and registers the guild commands without redeploying', async function() {
            const { body } = await send(admin('add', addOptions()));
            body.should.eql({ type: 5, data: { flags: 64 } });
            discord.edits()[0].should.containEql('/scrumfest-osaka-2027 を追加しました');
            discord.edits()[0].should.containEql('`PRETIX_KEY_SCRUMFEST` がまだ設定されていません');

            const saved = await store.getConference('scrumfest-osaka-2027');
            saved.pretix_base_url.should.equal('https://pretix.eu');
            saved.guild_id.should.equal(GUILD_ID);

            const [, appId, guildId, commands] = discord.calls.find(c => c[0] === 'setGuildCommands');
            appId.should.equal('999999999999999999');
            guildId.should.equal(GUILD_ID);
            commands.map(c => c.name).should.eql(['mogiri', 'mogiri-check', 'mogiri-admin', 'rsgt2027', 'scrumfest-osaka-2027']);
        });

        it('refuses a Pretix URL that is not in the allow list', async function() {
            await send(admin('add', addOptions({ base_url: 'https://evil.example' })));
            discord.edits()[0].should.startWith('❌ base_url');
            // URL はコードとして表示し、リンクのプレビューを出さない
            discord.edits()[0].should.containEql('`https://pretix.eu`');
            should(await store.getConference('scrumfest-osaka-2027')).be.null();
        });

        it('refuses secret names other than PRETIX_KEY_*', async function() {
            await send(admin('add', addOptions({ key_secret: 'DISCORD_BOT_TOKEN' })));
            discord.edits()[0].should.startWith('❌ key_secret');
            // _ が斜体の記号として読まれないよう、名前はコードとして表示する
            discord.edits()[0].should.containEql('`PRETIX_KEY_`');
        });

        it('normalizes the test order number like the check-in command', async function() {
            await send(admin('add', addOptions({ test_order: ' ＃ａｂｃ１２ ' })));
            discord.edits()[0].should.containEql('を追加しました');
            (await store.getConference('scrumfest-osaka-2027')).ordernumber_for_test.should.equal('ABC12');
        });

        it('refuses to take over a conference name used by another server', async function() {
            await send(admin('add', addOptions({ name: 'rsgt2027' }), { guildId: OTHER_GUILD_ID }));
            discord.edits()[0].should.containEql('別のサーバー');
            (await store.getConference('rsgt2027')).guild_id.should.equal(GUILD_ID);
        });

        it('removes a conference and its command', async function() {
            await send(admin('remove', [{ name: 'name', type: 3, value: 'rsgt2027' }]));
            should(await store.getConference('rsgt2027')).be.null();
            const [, , , commands] = discord.calls.find(c => c[0] === 'setGuildCommands');
            commands.map(c => c.name).should.not.containEql('rsgt2027');
        });

        it('lists conferences without exposing the token', async function() {
            await send(admin('list'));
            const text = discord.edits()[0];
            text.should.containEql('/rsgt2027');
            text.should.containEql('PRETIX_KEY_SCRUMGATHERING');
            // URL はひと続きにし、<> で囲んでリンクのプレビューを出さない
            text.should.match(/<https:\/\/pretix\.eu\/[^\s/]+\/[^\s/]+\/>/);
            text.should.not.containEql('pretix-secret-token');
        });
    });

    describe('/mogiri-admin whois', function() {
        const ATTENDEE = '666666666666666666';
        const whois = ({ member = { roles: [ROLE_ID] }, userId = ATTENDEE } = {}) => {
            const interaction = commandInteraction('mogiri-admin', {
                options: [{ type: 1, name: 'whois', options: [{ name: 'user', type: 6, value: userId }] }],
            });
            interaction.data.resolved = member ? { members: { [userId]: member } } : {};
            return interaction;
        };

        beforeEach(async function() {
            // 同じ注文をほかの人が先に1枚使っている
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: '1' });
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: ATTENDEE });
            // 別のサーバーの記録は出さない
            await store.recordCheckin({ guildId: OTHER_GUILD_ID, conference: 'other', orderNumber: 'ZZ00Z', userId: ATTENDEE });
        });

        it('shows the check-ins, the role and the attempts of the chosen user only to the admin', async function() {
            await store.recordAttempt(ATTENDEE, 600, 5);
            const { body } = await send(whois());
            body.should.eql({ type: 5, data: { flags: 64 } });
            const text = discord.edits()[0];
            text.should.containEql(`<@${ATTENDEE}>`);
            text.should.match(/• \/rsgt2027 \d{4}\/\d{2}\/\d{2} \d{2}:\d{2} 注文 `AB12C`（2枚目）/);
            text.should.not.containEql('ZZ00Z');
            text.should.containEql('/rsgt2027 「RSGT2027参加者」: あり');
            text.should.containEql('1回 / 上限 5回');
            text.should.not.containEql('上限に達しています');
        });

        it('points out a user who hit the attempt limit and has no role', async function() {
            for (let i = 0; i < 5; i++) await store.recordAttempt('777777777777777777', 600, 5);
            await send(whois({ userId: '777777777777777777', member: { roles: [] } }));
            const text = discord.edits()[0];
            text.should.containEql('このサーバーでの記録はありません');
            text.should.containEql('どの参加者ロールも持っていません');
            text.should.containEql('上限に達しています');
        });

        it('says so when the user is not a member of the server', async function() {
            await send(whois({ member: null }));
            const text = discord.edits()[0];
            text.should.containEql('このサーバーのメンバーではありません');
            text.should.containEql('/rsgt2027 「RSGT2027参加者」: なし');
        });

        it('does not mention anyone in the reply', async function() {
            await send(whois());
            discord.calls.filter(c => c[0] === 'sendMessage').should.have.length(0);
        });
    });

    describe('/mogiri-admin order', function() {
        const orderCommand = (number, name) => commandInteraction('mogiri-admin', {
            options: [{ type: 1, name: 'order', options: [
                { name: 'number', type: 3, value: number },
                ...(name ? [{ name: 'name', type: 3, value: name }] : []),
            ] }],
        });

        beforeEach(async function() {
            // Gateway 版から取り込んだ記録（ユーザーなし）と、サーバーレス版での受付2回
            d1.raw.prepare(`INSERT INTO checkins (guild_id, conference, order_number, created_at)
                VALUES (?, 'rsgt2027', 'AB12C', '2026-01-01T00:00:00.000Z')`).run(GUILD_ID);
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: '1' });
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: '2' });
        });

        it('lists who used the order and compares it with the tickets in Pretix', async function() {
            const { body } = await send(orderCommand('＃ab12c'));
            body.should.eql({ type: 5, data: { flags: 64 } });
            const text = discord.edits()[0];
            text.should.containEql('🎫 注文 `AB12C`');
            text.should.containEql('**/rsgt2027**（受付 3回）');
            text.should.containEql('Pretix: 有効・入場券 2枚（⚠️ 1回多く受付されている）');
            text.should.containEql('1枚目 2026/01/01 09:00 （だれが受付したかの記録なし）');
            text.should.containEql('<@1>');
            text.should.containEql('3枚目');
            pretixCalls.should.have.length(1);
            pretixCalls[0].order.should.equal('AB12C');
        });

        it('explains why Pretix rejects the order', async function() {
            pretixResult = { isValid: false, ticketCount: 0, reason: 'not_paid_or_canceled' };
            await send(orderCommand('AB12C'));
            discord.edits()[0].should.containEql('Pretix: 未払いかキャンセル済み');
        });

        it('does not call Pretix for an order without records unless a conference is named', async function() {
            await send(orderCommand('ZZ99Z'));
            discord.edits()[0].should.containEql('このサーバーでの受付の記録はありません');
            pretixCalls.should.have.length(0);

            await send(orderCommand('ZZ99Z', 'rsgt2027'));
            discord.edits()[1].should.containEql('**/rsgt2027**（受付 0回）');
            pretixCalls.should.have.length(1);
        });

        it('rejects input that is not an order number', async function() {
            await send(orderCommand('AB-12'));
            discord.edits()[0].should.startWith('❌');
            pretixCalls.should.have.length(0);
        });
    });

    describe('/mogiri-admin analytics', function() {
        const analytics = name => commandInteraction('mogiri-admin', {
            options: [{ type: 1, name: 'analytics', options: name ? [{ name: 'name', type: 3, value: name }] : [] }],
        });

        beforeEach(async function() {
            // 同じ注文で2枚、別の注文で1枚。うち1枚は昨日以前の記録
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: '1' });
            await store.recordCheckin({ guildId: GUILD_ID, conference: 'rsgt2027', orderNumber: 'AB12C', userId: '2' });
            d1.raw.prepare(`INSERT INTO checkins (guild_id, conference, order_number, user_id, created_at)
                VALUES (?, 'rsgt2027', 'CD34E', '3', '2026-01-01T00:00:00.000Z')`).run(GUILD_ID);
        });

        it('lists check-in counts for every conference without calling Pretix', async function() {
            const { body } = await send(analytics());
            body.should.eql({ type: 5, data: { flags: 64 } });
            discord.edits()[0].should.containEql('/rsgt2027 … 受付 3枚（注文 2件）・今日 2枚');
            soldCalls.should.have.length(0);
        });

        it('shows the sold count and the check-in rate for the named conference', async function() {
            await send(analytics('rsgt2027'));
            const text = discord.edits()[0];
            text.should.containEql('受付 3枚（注文 2件）・今日 2枚');
            text.should.containEql('販売 8枚（支払い済みの入場券）・受付率 38%');
            soldCalls.should.have.length(1);
            soldCalls[0].pretix_private_key.should.equal('pretix-secret-token');
        });

        it('says so when Pretix cannot be read', async function() {
            soldResult = null;
            await send(analytics('rsgt2027'));
            discord.edits()[0].should.containEql('販売枚数を取得できませんでした');
        });

        it('does not call Pretix when the token secret is missing', async function() {
            delete env.PRETIX_KEY_SCRUMGATHERING;
            await send(analytics('rsgt2027'));
            discord.edits()[0].should.containEql('`PRETIX_KEY_SCRUMGATHERING` が設定されていない');
            soldCalls.should.have.length(0);
        });

        it('does not count conferences of another server', async function() {
            await send(analytics('rsgt2027'));
            await send(commandInteraction('mogiri-admin', {
                guildId: OTHER_GUILD_ID,
                options: [{ type: 1, name: 'analytics', options: [{ name: 'name', type: 3, value: 'rsgt2027' }] }],
            }));
            discord.edits()[1].should.containEql('このサーバーに登録されていません');
            soldCalls.should.have.length(1);
        });

        it('is refused for users not listed in ADMIN_USER_IDS', async function() {
            const { body } = await send(commandInteraction('mogiri-admin', {
                userId: '777777777777777777',
                options: [{ type: 1, name: 'analytics', options: [] }],
            }));
            body.data.content.should.containEql('運営者だけ');
        });
    });
});
