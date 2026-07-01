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
        return conferences[conference_name].discord_role + "のロールがサーバー上に見つかりませんでした。チケット購入時のメールに記載されているサーバーにアクセスしてコマンドを試してください。";
    } else if (interaction.member.roles.cache.some(role => role.name === conferences[conference_name].discord_role)) {
        // already have the role
        return "すでに" + role.name + "のロールをお持ちでした！";
    }

    // チケットプラットフォームの判定
    if (conferences[conference_name].pretix_private_key) {
        // Pretixの場合
        const result = await checkPretixOrder(ordernumber, conferences[conference_name]);

        if (result.isValid) {
            // 使用回数をカウント（キャッシュから）
            let usageCount = 0;

            // 現在のguildの設定を取得
            const currentGuild = global.guilds ? Object.values(global.guilds).find(g => g.guildId === interaction.guildId) : null;

            if (currentGuild && currentGuild.checkin_channel_id && global.checkinCache) {
                const cache = global.checkinCache.get(currentGuild.checkin_channel_id);
                if (cache) {
                    // キャッシュから高速検索
                    const searchKey1 = ordernumber + "は有効なPretixオーダー番号です。";
                    const searchKey2 = ordernumber + "は有効なPretixオーダー番号です。 [" + conference_name + "]";

                    usageCount = Array.from(cache).filter(content =>
                        content.includes(searchKey1) || content.includes(searchKey2)
                    ).length;
                }
            }

            // メッセージにイベント名タグとチケット使用状況を追加
            const ticketInfo = result.ticketCount > 0 ? ` (${usageCount + 1}/${result.ticketCount}枚目)` : '';
            const message = ordernumber + "は有効なPretixオーダー番号です。 [" + conference_name + "]" + ticketInfo;

            client.channels.cache.get(channelId).send(message);
            member.roles.add(role);
            client.channels.cache.get(channelId).send(role.name + "のロールをつけました！");

            // 新しいメッセージをキャッシュに追加
            if (currentGuild && currentGuild.checkin_channel_id && global.checkinCache) {
                const cache = global.checkinCache.get(currentGuild.checkin_channel_id);
                if (cache) {
                    cache.add(message);
                }
            }

            return "Pretixでの認証が完了しました。";
        } else {
            if (result.reason === 'no_admission') {
                client.channels.cache.get(channelId).send(ordernumber + "は入場券ではないため、参加者ロールを付与できません。");
                return "このオーダー番号は入場券ではないため、Pretixでの認証に失敗しました。";
            }
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
