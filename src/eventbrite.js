'use strict';

const axios = require('axios');

async function checkEventbriteOrder(orderId, conference) {
    try {
        const response = await axios.get(
            'https://www.eventbriteapi.com/v3/orders/' + orderId,
            {
                headers: {
                    Authorization: `Bearer ${conference.eventbrite_private_key}`,
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                }
            }
        );

        return response.data.event_id == conference.eventbrite_event_id;
    } catch (error) {
        // 無効なオーダー番号の場合（400エラー）は静かに処理
        if (error.response && error.response.status === 400) {
            return false;
        }
        // その他のエラーの場合はログ出力
        console.error('Eventbrite API error:', error.message);
        return false;
    }
}

module.exports = checkEventbriteOrder;
