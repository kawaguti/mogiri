// mogiri サーバーレス版（Cloudflare Workers）のエントリーポイント。
// Discord の Interactions Endpoint URL にこの Worker の URL を設定すると、スラッシュコマンドが HTTP で届く。

import checkPretixOrder from '../../src/pretix.js';
import { createDiscordClient } from './discord.js';
import { routeInteraction, runDeferred } from './handlers.js';
import { createStore } from './store.js';
import { verifyDiscordRequest } from './verify.js';

export function createWorker(overrides = {}) {
    return {
        async fetch(request, env, ctx) {
            if (request.method !== 'POST') {
                return new Response('mogiri is running\n', { headers: { 'Content-Type': 'text/plain' } });
            }

            const body = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY, overrides.now?.());
            if (body === null) {
                return new Response('invalid request signature', { status: 401 });
            }

            let interaction;
            try {
                interaction = JSON.parse(body);
            }
            catch {
                return new Response('invalid JSON', { status: 400 });
            }

            const deps = {
                env,
                store: overrides.store ?? createStore(env.DB),
                discord: overrides.discord ?? createDiscordClient({ token: env.DISCORD_BOT_TOKEN }),
                checkPretixOrder: overrides.checkPretixOrder ?? checkPretixOrder,
            };

            const { response, work } = routeInteraction(interaction, deps);
            if (work) {
                ctx.waitUntil(runDeferred(interaction, work, deps));
            }
            return Response.json(response);
        },
    };
}

export default createWorker();
