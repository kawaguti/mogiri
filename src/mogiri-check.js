'use strict';

const { conferences } = require('../config.json');
const axios = require('axios');

module.exports = (client, interaction, conference_name ) => {
    const channelId = interaction.channelId;
    const channel = client.channels.cache.get(channelId);

    channel.send("testing with conference : " + conference_name );

    // check roles
    channel.send("check roles ..... ");
    const role = interaction.guild.roles.cache.find(role => role.name === conferences[conference_name].discord_role);
    if (role) {
        channel.send(conferences[conference_name].discord_role + "のロールがサーバー上に見つかりました");
    } else {
        channel.send(conferences[conference_name].discord_role + "のロールがサーバー上に見つかりませんでした");
    }
    
    const has_role = interaction.member.roles.cache.some(role => role.name === conferences[conference_name].discord_role);
    if (has_role) {
        channel.send( role.name + "のロールをお持ちでした！" );
    } else {
        channel.send( role.name + "のロールをお持ちではありませんでした！" );
    }

    // asking for eventbrite
    channel.send("asking for eventbrite ..... ");
    const eventbrite_order_id = conferences[conference_name].ordernumber_for_test;

    axios.get('https://www.eventbriteapi.com/v3/orders/'
            + eventbrite_order_id,
            { headers: {
                Authorization: `Bearer ${conferences[conference_name].eventbrite_private_key}`,
            }
    })
    .then(function (response) {
        if (response.data.event_id == conferences[conference_name].eventbrite_event_id) {
            // for this event
            channel.send( eventbrite_order_id + "は有効なEventbriteオーダー番号です。");
        } else {
            // not for this event
            channel.send( eventbrite_order_id + "は別のイベントのオーダー番号のようです。 https://www.eventbrite.com/e/" + response.data.event_id);
        }
    })
    .catch(function (error) {
        // invalid order id
        channel.send( eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。");
    })

    return "mogiri-check called!";
}