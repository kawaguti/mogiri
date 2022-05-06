'use strict';

const { conferences } = require('../config.json');
const orderid = require('./orderid.js');
const { eventbrite } = require("./eventbrite");

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
    eventbrite(eventbrite_order_id, conference_name, client, channelId, member, role);

    return "Asking for Eventbrite: " + eventbrite_order_id;
}


