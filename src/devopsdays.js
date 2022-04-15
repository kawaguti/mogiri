'use strict';

const { eventbrite_private_key, eventbrite_event_id, discord_role } = require('../config.json');
const axios = require('axios');

module.exports = (client, interaction) => {
    const channelId = interaction.channelId;
    const member = interaction.member;
    const ordernumber = interaction.options.getString('ordernumber');

    // check roles
    const role = interaction.guild.roles.cache.find(role => role.name === discord_role);
    if (role == "") {
        // no suiteble roles in this server
        return discord_role + "のロールがサーバー上に見つかりませんでした";
    } else if (interaction.member.roles.cache.some(role => role.name === discord_role)) {
        // already have the role
        return "すでに" + role.name + "のロールをお持ちでした！";
    }

    // check eventbrite_order_id format
    const re = /(\d{10})/;
    if ( re.exec(ordernumber) == null) {
        return ordernumber + "はEventbriteオーダー番号の形式ではありません。";
    }

    // capture eventbrite_order_id
    const eventbrite_order_id = re.exec(ordernumber)[1];

    // asking for eventbrite
    axios.get('https://www.eventbriteapi.com/v3/orders/'
            + eventbrite_order_id,
            { headers: {
                Authorization: `Bearer ${eventbrite_private_key}`,
            }
    })
    .then(function (response) {
        if (response.data.event_id == eventbrite_event_id) {
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