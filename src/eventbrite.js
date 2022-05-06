'use strict';
const { conferences } = require('../config.json');
const axios = require('axios');

function eventbrite(eventbrite_order_id, conference_name, client, channelId, member, role) {
    axios.get('https://www.eventbriteapi.com/v3/orders/'
        + eventbrite_order_id,
        {
            headers: {
                Authorization: `Bearer ${conferences[conference_name].eventbrite_private_key}`,
            }
        })
        .then(function (response) {
            if (response.data.event_id == conferences[conference_name].eventbrite_event_id) {
                // for this event
                client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");
                member.roles.add(role);
                client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
            } else {
                // not for this event
                client.channels.cache.get(channelId).send(eventbrite_order_id + "は別のイベントのオーダー番号のようです。 https://www.eventbrite.com/e/" + response.data.event_id);
            }
        })
        .catch(function (error) {
            // invalid order id
            client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。");
        });
}
exports.eventbrite = eventbrite;
