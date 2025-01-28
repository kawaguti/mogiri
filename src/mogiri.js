'use strict';

const { conferences } = require('../config.json');
const orderid = require('./orderid.js');
const checkEventbriteOrder = require('./eventbrite.js');
const checkPretixOrder = require('./pretix.js');

module.exports = async (client, interaction, ordernumber, member, conference_name) => {
    const channelId = interaction.channelId;

    // check roles
    const role = interaction.guild.roles.cache.find(role => role.name === conferences[conference_name].discord_role);
    if (!role) {
        // no suitable roles in this server
        return conferences[conference_name].discord_role + "のロールがサーバー上に見つかりませんでした";
    } else if (interaction.member.roles.cache.some(role => role.name === conferences[conference_name].discord_role)) {
        // already have the role
        return "すでに" + role.name + "のロールをお持ちでした！";
    }

    // チケットプラットフォームの判定
    if (conferences[conference_name].pretix_private_key) {
        // Pretixの場合
        const isValid = await checkPretixOrder(ordernumber, conferences[conference_name]);
        if (isValid) {
            client.channels.cache.get(channelId).send(ordernumber + "は有効なPretixオーダー番号です。");
            member.roles.add(role);
            client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
            return "Pretixでの認証が完了しました。";
        } else {
            client.channels.cache.get(channelId).send(ordernumber + "は有効なPretixオーダー番号ではありませんでした。");
            return "Pretixでの認証に失敗しました。";
        }
    } else {
        // Eventbriteの場合
        const eventbrite_order_id = orderid(ordernumber);
        if (!eventbrite_order_id) {
            return ordernumber + "はEventbriteオーダー番号の形式ではありません。";
        }

        const isValid = await checkEventbriteOrder(eventbrite_order_id, conferences[conference_name]);
        if (isValid) {
            client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");
            member.roles.add(role);
            client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");
            return "Eventbriteでの認証が完了しました。";
        } else {
            client.channels.cache.get(channelId).send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。");
            return "Eventbriteでの認証に失敗しました。";
        }
    }
}
