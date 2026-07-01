'use strict';

const axios = require('axios');

async function fetchAdmissionItemIds(conference) {
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
        reason: null
    };
}

module.exports = checkPretixOrder;
