'use strict';

// Node.js 22 と Cloudflare Workers の両方で動くよう、axios ではなく fetch を使う。
// サーバーレス版（serverless/）もこのモジュールをそのまま使い回している。

// Pretix のオーダーコードは英数字のみ。URL に埋め込む前に形式を確認し、
// "../" などで別のイベントのエンドポイントを参照されないようにする。
const ORDER_CODE_PATTERN = /^[A-Za-z0-9]{1,32}$/;

// Pretix が応答しないときに待ち続けないよう、1回の問い合わせを打ち切る時間
const REQUEST_TIMEOUT_MS = 8000;

async function getJson(url, conference) {
    const res = await fetch(url, {
        headers: { Authorization: `Token ${conference.pretix_private_key}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        error.status = res.status;
        throw error;
    }
    return res.json();
}

function eventUrl(conference) {
    return `${conference.pretix_base_url}/api/v1/organizers/${encodeURIComponent(conference.pretix_organizer)}/events/${encodeURIComponent(conference.pretix_event_slug)}`;
}

async function fetchAdmissionItemIds(conference) {
    const admissionIds = new Set();
    const origin = new URL(conference.pretix_base_url).origin;
    let url = `${eventUrl(conference)}/items/`;

    while (url) {
        // ページ送りの URL は API の応答から来るので、トークンを別のホストへ送らないよう確認する
        if (new URL(url).origin !== origin) {
            throw new Error('Pretix pagination URL points to another origin');
        }
        const data = await getJson(url, conference);
        for (const item of data.results || []) {
            if (item.admission === true) {
                admissionIds.add(item.id);
            }
        }
        url = data.next || null;
    }

    return admissionIds;
}

async function checkPretixOrder(orderId, conference) {
    if (typeof orderId !== 'string' || !ORDER_CODE_PATTERN.test(orderId)) {
        return { isValid: false, ticketCount: 0, reason: 'invalid_format' };
    }

    let orderData;
    try {
        orderData = await getJson(`${eventUrl(conference)}/orders/${orderId}/`, conference);
    } catch (error) {
        console.error('Pretix API error (order):', error.message);
        return { isValid: false, ticketCount: 0, reason: 'api_error' };
    }

    // オーダーが支払い済みで、キャンセルされていないことを確認
    const paidAndActive = orderData.status === 'p' && !orderData.cancellation_date;
    if (!paidAndActive) {
        return { isValid: false, ticketCount: 0, reason: 'not_paid_or_canceled' };
    }

    // 入場券として扱う item ID を毎回取得する。
    // 開催期間中に主催者が新しい入場券種別を追加した場合でも、キャッシュ由来の
    // 誤判定（正当な購入者を no_admission で弾く）を避けるため、常に最新を参照する。
    let admissionItemIds;
    try {
        admissionItemIds = await fetchAdmissionItemIds(conference);
    } catch (error) {
        console.error('Pretix API error (items):', error.message);
        // items が取れない場合は入場券判定できないので、フォールバックで全 position を計上
        const fallbackCount = (orderData.positions || []).filter(p => !p.canceled).length;
        return { isValid: fallbackCount > 0, ticketCount: fallbackCount, reason: null };
    }

    // 入場券の position だけカウント（キャンセル済みは除外）
    const admissionPositions = (orderData.positions || []).filter(
        p => !p.canceled && admissionItemIds.has(p.item)
    );

    if (admissionPositions.length === 0) {
        return { isValid: false, ticketCount: 0, reason: 'no_admission' };
    }

    return {
        isValid: true,
        ticketCount: admissionPositions.length,
        reason: null,
    };
}

// 支払い済みの注文に含まれる入場券の枚数（販売枚数）を返す。取れなければ null。
// orderpositions の一覧は件数（count）を返すので、1ページ目だけ読めば足りる。
// キャンセルされた position は既定で一覧に含まれない。
async function countPaidAdmissions(conference) {
    try {
        const admissionItemIds = await fetchAdmissionItemIds(conference);
        if (admissionItemIds.size === 0) return 0;
        const ids = [...admissionItemIds].join(',');
        const data = await getJson(`${eventUrl(conference)}/orderpositions/?order__status=p&item__in=${ids}`, conference);
        return Number.isInteger(data.count) ? data.count : null;
    } catch (error) {
        console.error('Pretix API error (positions):', error.message);
        return null;
    }
}

module.exports = checkPretixOrder;
module.exports.countPaidAdmissions = countPaidAdmissions;
