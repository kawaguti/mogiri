'use strict';

const { conferences } = require('../config.json');
const axios = require('axios');
const orderid = require('./orderid.js');

module.exports = (client, interaction, ordernumber, member, conference_name ) => {
    const channelId = interaction.channelId;

    // check roles
    const role = interaction.guild.roles.cache.find(role => role.name === conferences[conference_name].discord_role);
    if (!role) {
        // no suiteble roles in this server
        return conferences[conference_name].discord_role + "のロールがサーバー上に見つかりませんでした";
    } else if (interaction.member.roles.cache.some(role => role.name === conferences[conference_name].discord_role)) {
        // already have the role
        return "すでに" + role.name + "のロールをお持ちでした！";
    }

    // check eventbrite_order_id format
    const eventbrite_order_id = orderid(ordernumber);
    if ( !eventbrite_order_id ) {
        return ordernumber + "はEventbriteオーダー番号の形式ではありません。";
    }

    // asking for eventbrite
    axios.get('https://www.eventbriteapi.com/v3/orders/'
            + eventbrite_order_id,
            { headers: {
                Authorization: `Bearer ${conferences[conference_name].eventbrite_private_key}`,
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
            }
    })
    .then(function (response) {
        if (response.data.event_id == conferences[conference_name].eventbrite_event_id) {
            // for this event
            client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。")
            member.roles.add(role);
            client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
        } else {
            // not for this event
            client.channels.cache.get(channelId).send(eventbrite_order_id + "は別のイベントのオーダー番号のようです。 https://www.eventbrite.com/e/" + response.data.event_id)
        }
    })
    .catch(function (error) {
        // invalid order id
        client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。")
    })

    return "Asking for Eventbrite: " + eventbrite_order_id;
}