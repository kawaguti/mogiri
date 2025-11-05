'use strict';

const { conferences, guilds } = require('../config.json');
const checkEventbriteOrder = require('./eventbrite.js');
const checkPretixOrder = require('./pretix.js');

module.exports = async (client, interaction, conference_name) => {
    const channelId = interaction.channelId;
    const channel = client.channels.cache.get(channelId);

    // キャッシュ状態の確認（最初に表示）
    if (conference_name === Object.keys(conferences)[0]) {
        // 最初のカンファレンスのときだけキャッシュ状態を表示
        const currentGuild = guilds ? Object.entries(guilds).find(([name, g]) => g.guildId === interaction.guildId) : null;

        if (currentGuild) {
            const [guildName, guildConfig] = currentGuild;
            channel.send("━━━━━━━━━━━━━━━━━━━━━━");
            channel.send("📊 キャッシュ状態の確認");
            channel.send("Guild: " + guildName);

            if (guildConfig.checkin_channel_id) {
                const cache = global.checkinCache ? global.checkinCache.get(guildConfig.checkin_channel_id) : null;
                if (cache) {
                    channel.send(`✅ キャッシュ: 有効 (${cache.size}件の履歴)`);
                    channel.send(`📍 チャンネルID: ${guildConfig.checkin_channel_id}`);
                } else {
                    channel.send(`⚠️ キャッシュ: 無効 (チャンネルが見つからないか、まだ構築されていません)`);
                }
            } else {
                channel.send(`ℹ️ キャッシュ: 未設定 (checkin_channel_id が config.json に設定されていません)`);
            }
            channel.send("━━━━━━━━━━━━━━━━━━━━━━\n");
        }
    }

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

        const result = await checkPretixOrder(ordernumber, conferences[conference_name]);
        if (result.isValid) {
            channel.send(ordernumber + "は有効なPretixオーダー番号です。");
            if (result.ticketCount > 0) {
                channel.send(`🎫 チケット枚数: ${result.ticketCount}枚`);
            }
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
