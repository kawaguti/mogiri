'use strict';

const axios = require('axios');

async function checkPretixOrder(orderId, conference) {
    try {
        const response = await axios.get(
            `${conference.pretix_base_url}/api/v1/organizers/${conference.pretix_organizer}/events/${conference.pretix_event_slug}/orders/${orderId}/`,
            {
                headers: {
                    Authorization: `Token ${conference.pretix_private_key}`,
                }
            }
        );

        // オーダーが支払い済みで、キャンセルされていないことを確認
        return response.data.status === 'p' && !response.data.cancellation_date;
    } catch (error) {
        console.error('Pretix API error:', error.message);
        return false;
    }
}

module.exports = checkPretixOrder;
