'use strict';

const axios = require('axios');

// イベント単位で admission 属性を持つ item ID のセットをキャッシュ
// key: `${base_url}|${organizer}|${event_slug}` -> Set<itemId>
const admissionItemsCache = new Map();

async function fetchAdmissionItemIds(conference) {
    const cacheKey = `${conference.pretix_base_url}|${conference.pretix_organizer}|${conference.pretix_event_slug}`;
    if (admissionItemsCache.has(cacheKey)) {
        return admissionItemsCache.get(cacheKey);
    }

    const admissionIds = new Set();
    let url = `${conference.pretix_base_url}/api/v1/organizers/${conference.pretix_organizer}/events/${conference.pretix_event_slug}/items/`;

    while (url) {
        const res = await axios.get(url, {
            headers: { Authorization: `Token ${conference.pretix_private_key}` }
        });
        for (const item of res.data.results || []) {
            if (item.admission === true) {
                admissionIds.add(item.id);
            }
        }
        url = res.data.next || null;
    }

    admissionItemsCache.set(cacheKey, admissionIds);
    return admissionIds;
}

async function checkPretixOrder(orderId, conference) {
    let orderData;
    try {
        const response = await axios.get(
            `${conference.pretix_base_url}/api/v1/organizers/${conference.pretix_organizer}/events/${conference.pretix_event_slug}/orders/${orderId}/`,
            {
                headers: {
                    Authorization: `Token ${conference.pretix_private_key}`,
                }
            }
        );
        orderData = response.data;
    } catch (error) {
        console.error('Pretix API error (order):', error.message);
        return { isValid: false, ticketCount: 0, reason: 'api_error' };
    }

    // オーダーが支払い済みで、キャンセルされていないことを確認
    const paidAndActive = orderData.status === 'p' && !orderData.cancellation_date;
    if (!paidAndActive) {
        return { isValid: false, ticketCount: 0, reason: 'not_paid_or_canceled' };
    }

    // 入場券として扱う item ID を取得
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
        reason: null
    };
}

module.exports = checkPretixOrder;
