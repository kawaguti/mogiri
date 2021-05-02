const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const D = require('dumpjs');
require('dotenv').config();

client.once('ready', () => {
  console.log ('This bot is online!');
})

client.on('message', message => {
  if( message.author.bot) return;
  
  const re1 = /大島さん/;
  if ( re1.test(message.content) ){
    message.channel.send('児島だよ');
  }
  console.log(message.content);

  const re = /(\d{10})/;
  if ( re.test(message.content) ) {
    const eventbrite_order_id = RegExp.lastMatch;

    axios.get('https://www.eventbriteapi.com/v3/orders/' 
          + eventbrite_order_id
          + '?token=' 
          + process.env.EVENTBRITE_PRIVATE_KEY)
    .then(function (response) {
      console.log(response.status + " : " + response.data.name);
      console.log(D.dump(response.data));
      message.reply(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");

      const role = message.guild.roles.cache.find(role => role.name === process.env.DISCORD_ROLE_FOR_VALIDATED_USER );
      if ( role ) {
        if (message.member.roles.cache.some(role => role.name === process.env.DISCORD_ROLE_FOR_VALIDATED_USER)) {
          message.reply("すでに" + role.name + "のロールをお持ちでした！");
        } else {
          message.member.roles.add(role);
          message.reply(role.name + "のロールをつけました！");
        }
      }
    })
    .catch(function (error) {
      console.log(error);
      if (error.response.status == 400) {
        message.reply("あら、" + eventbrite_order_id + "はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。");
      }
    })
  }
})

client.login(process.env.DISCORD_PRIVATE_KEY);
