'use strict';

const { conferences } = require('../config.json');
const checkEventbriteOrder = require('./eventbrite.js');
const checkPretixOrder = require('./pretix.js');

module.exports = async (client, interaction, conference_name) => {
    const channelId = interaction.channelId;
    const channel = client.channels.cache.get(channelId);

    channel.send("testing with conference : " + conference_name);

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
        channel.send(conferences[conference_name].discord_role + "のロールをお持ちでした！");
    } else {
        channel.send(conferences[conference_name].discord_role + "のロールをお持ちではありませんでした！");
    }

    // チケットプラットフォームの判定とテスト
    if (conferences[conference_name].pretix_private_key) {
        // Pretixの場合
        channel.send("asking for pretix ..... ");
        const ordernumber = conferences[conference_name].ordernumber_for_test;
        
        const isValid = await checkPretixOrder(ordernumber, conferences[conference_name]);
        if (isValid) {
            channel.send(ordernumber + "は有効なPretixオーダー番号です。");
        } else {
            channel.send(ordernumber + "は有効なPretixオーダー番号ではありませんでした。");
        }
    } else {
        // Eventbriteの場合
        channel.send("asking for eventbrite ..... ");
        const eventbrite_order_id = conferences[conference_name].ordernumber_for_test;
        
        const isValid = await checkEventbriteOrder(eventbrite_order_id, conferences[conference_name]);
        if (isValid) {
            channel.send(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");
        } else {
            channel.send(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありませんでした。");
        }
    }

    return "mogiri-check called!";
}
