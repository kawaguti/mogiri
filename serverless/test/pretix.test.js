// src/pretix.js（Gateway 版と共用）の判定ロジックを、fetch を差し替えて確かめる。実際の Pretix には接続しない。
import should from 'should';
import checkPretixOrder from '../../src/pretix.js';

const conference = {
    pretix_base_url: 'https://pretix.eu',
    pretix_organizer: 'scrumgathering',
    pretix_event_slug: 'rsgt2027',
    pretix_private_key: 'token',
};
const BASE = 'https://pretix.eu/api/v1/organizers/scrumgathering/events/rsgt2027';
const ITEMS = { results: [{ id: 1, admission: true }, { id: 2, admission: false }], next: null };

describe('pretix (fetch based)', function() {
    let originalFetch;
    let originalError;
    let requests;

    beforeEach(function() {
        originalFetch = globalThis.fetch;
        originalError = console.error;
        console.error = () => {};
        requests = [];
    });
    afterEach(function() {
        globalThis.fetch = originalFetch;
        console.error = originalError;
    });

    // URL ごとの応答を決めておく。値が数値ならそのステータスで失敗させる
    function stubFetch(routes) {
        globalThis.fetch = async (url, init) => {
            requests.push({ url, init });
            const route = routes[url];
            if (route === undefined) return new Response('not found', { status: 404 });
            if (typeof route === 'number') return new Response('error', { status: route });
            return Response.json(route);
        };
    }

    const order = (positions, extra = {}) => ({ status: 'p', cancellation_date: null, positions, ...extra });

    it('counts only active admission positions', async function() {
        stubFetch({
            [`${BASE}/orders/AB12C/`]: order([{ item: 1 }, { item: 1 }, { item: 1, canceled: true }, { item: 2 }]),
            [`${BASE}/items/`]: ITEMS,
        });
        const result = await checkPretixOrder('AB12C', conference);
        result.should.eql({ isValid: true, ticketCount: 2, reason: null });
        requests[0].init.headers.Authorization.should.equal('Token token');
    });

    it('follows item pagination on the same host', async function() {
        stubFetch({
            [`${BASE}/orders/AB12C/`]: order([{ item: 3 }]),
            [`${BASE}/items/`]: { results: [], next: `${BASE}/items/?page=2` },
            [`${BASE}/items/?page=2`]: { results: [{ id: 3, admission: true }], next: null },
        });
        (await checkPretixOrder('AB12C', conference)).ticketCount.should.equal(1);
    });

    it('does not send the token to another host via pagination (falls back to counting positions)', async function() {
        stubFetch({
            [`${BASE}/orders/AB12C/`]: order([{ item: 2 }]),
            [`${BASE}/items/`]: { results: [], next: 'https://evil.example/steal' },
        });
        const result = await checkPretixOrder('AB12C', conference);
        requests.map(r => r.url).should.not.containEql('https://evil.example/steal');
        result.should.eql({ isValid: true, ticketCount: 1, reason: null });
    });

    it('rejects unpaid or canceled orders', async function() {
        stubFetch({ [`${BASE}/orders/AB12C/`]: order([{ item: 1 }], { status: 'n' }) });
        (await checkPretixOrder('AB12C', conference)).reason.should.equal('not_paid_or_canceled');
        stubFetch({ [`${BASE}/orders/AB12C/`]: order([{ item: 1 }], { cancellation_date: '2027-01-01' }) });
        (await checkPretixOrder('AB12C', conference)).reason.should.equal('not_paid_or_canceled');
    });

    it('rejects orders with no admission ticket', async function() {
        stubFetch({ [`${BASE}/orders/AB12C/`]: order([{ item: 2 }]), [`${BASE}/items/`]: ITEMS });
        (await checkPretixOrder('AB12C', conference)).should.eql({ isValid: false, ticketCount: 0, reason: 'no_admission' });
    });

    it('treats an unknown order as api_error', async function() {
        stubFetch({});
        (await checkPretixOrder('INVALID123', conference)).should.eql({ isValid: false, ticketCount: 0, reason: 'api_error' });
    });

    it('treats a server error on the order as api_error', async function() {
        stubFetch({ [`${BASE}/orders/AB12C/`]: 503 });
        (await checkPretixOrder('AB12C', conference)).reason.should.equal('api_error');
    });

    it('treats a timeout as api_error and passes an abort signal', async function() {
        globalThis.fetch = async (url, init) => {
            requests.push({ url, init });
            throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
        };
        (await checkPretixOrder('AB12C', conference)).reason.should.equal('api_error');
        (requests[0].init.signal instanceof AbortSignal).should.be.true();
    });

    it('falls back to counting all active positions when items cannot be read', async function() {
        stubFetch({ [`${BASE}/orders/AB12C/`]: order([{ item: 1 }, { item: 2, canceled: true }]), [`${BASE}/items/`]: 500 });
        (await checkPretixOrder('AB12C', conference)).should.eql({ isValid: true, ticketCount: 1, reason: null });
    });

    ['../../other-event/orders/AB12C', 'AB12C/', '', 'a'.repeat(33), '@everyone'].forEach(input => {
        it(`does not call Pretix for malformed input ${JSON.stringify(input.slice(0, 20))}`, async function() {
            stubFetch({});
            (await checkPretixOrder(input, conference)).reason.should.equal('invalid_format');
            requests.should.have.length(0);
        });
    });

    it('still returns the result shape the Gateway version expects', async function() {
        stubFetch({});
        const result = await checkPretixOrder('AB12C', conference);
        result.should.have.properties(['isValid', 'ticketCount', 'reason']);
        should(result.isValid).be.false();
    });
});
