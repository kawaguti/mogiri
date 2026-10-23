import should from 'should';
import { attemptLimit } from '../src/handlers.js';
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
            discord.edits()[0].should.containEql('PRETIX_KEY_SCRUMFEST がまだ設定されていません');

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
            should(await store.getConference('scrumfest-osaka-2027')).be.null();
        });

        it('refuses secret names other than PRETIX_KEY_*', async function() {
            await send(admin('add', addOptions({ key_secret: 'DISCORD_BOT_TOKEN' })));
            discord.edits()[0].should.startWith('❌ key_secret');
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
            text.should.not.containEql('pretix-secret-token');
        });
    });
});
