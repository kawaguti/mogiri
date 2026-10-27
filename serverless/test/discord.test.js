import should from 'should';
import { createDiscordClient, DiscordApiError } from '../src/discord.js';
import { hexToBytes, verifyDiscordRequest } from '../src/verify.js';
import { createSigner } from './helpers.js';

describe('discord REST client', function() {
    function fakeFetch(responses) {
        const requests = [];
        const fetch = async (url, init) => {
            requests.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
            return responses.shift() ?? new Response(null, { status: 204 });
        };
        return { fetch, requests };
    }

    it('disables all mentions when posting a message', async function() {
        const { fetch, requests } = fakeFetch([Response.json({ id: '1' })]);
        await createDiscordClient({ token: 't', fetch }).sendMessage('42', '@everyone hi');
        requests[0].url.should.equal('https://discord.com/api/v10/channels/42/messages');
        requests[0].init.headers.Authorization.should.equal('Bot t');
        requests[0].body.should.eql({ content: '@everyone hi', allowed_mentions: { parse: [] } });
    });

    it('edits the original interaction response without the bot token', async function() {
        const { fetch, requests } = fakeFetch([Response.json({})]);
        await createDiscordClient({ token: 't', fetch }).editOriginalResponse('app', 'tok', 'done');
        requests[0].init.method.should.equal('PATCH');
        requests[0].url.should.equal('https://discord.com/api/v10/webhooks/app/tok/messages/@original');
        should(requests[0].init.headers.Authorization).be.undefined();
    });

    it('retries once after a 429 rate limit', async function() {
        const slept = [];
        const { fetch, requests } = fakeFetch([Response.json({ retry_after: 0.5 }, { status: 429 }), new Response(null, { status: 204 })]);
        await createDiscordClient({ token: 't', fetch, sleep: async ms => slept.push(ms) }).addMemberRole('g', 'u', 'r');
        requests.should.have.length(2);
        requests[1].init.method.should.equal('PUT');
        slept.should.eql([500]);
    });

    it('throws DiscordApiError on failure', async function() {
        const { fetch } = fakeFetch([new Response('Missing Permissions', { status: 403 })]);
        await createDiscordClient({ token: 't', fetch }).addMemberRole('g', 'u', 'r')
            .should.be.rejectedWith(DiscordApiError, { status: 403 });
    });
});

describe('request signature', function() {
    let signer;
    before(async function() {
        signer = await createSigner();
    });

    it('returns the body for a valid signature', async function() {
        const body = await verifyDiscordRequest(await signer.signedRequest({ type: 1 }), signer.publicKeyHex);
        body.should.equal('{"type":1}');
    });

    it('returns null for a signature made with another key', async function() {
        const other = await createSigner();
        should(await verifyDiscordRequest(await other.signedRequest({ type: 1 }), signer.publicKeyHex)).be.null();
    });

    it('returns null when headers are missing', async function() {
        const request = new Request('https://x.example/', { method: 'POST', body: '{}' });
        should(await verifyDiscordRequest(request, signer.publicKeyHex)).be.null();
    });

    it('returns null when the timestamp in the signed data differs from the header', async function() {
        const request = await signer.signedRequest({ type: 1 });
        const forged = new Request(request, { headers: { ...Object.fromEntries(request.headers), 'x-signature-timestamp': String(Number(request.headers.get('x-signature-timestamp')) + 1) } });
        should(await verifyDiscordRequest(forged, signer.publicKeyHex)).be.null();
    });

    it('rejects malformed hex', function() {
        (() => hexToBytes('zz')).should.throw();
        hexToBytes('0aff').should.eql(new Uint8Array([10, 255]));
    });
});
