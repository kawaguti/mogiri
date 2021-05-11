const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const D = require('dumpjs');
require('dotenv').config();
const config = require('config');
const dataFilePath = config.get('data.filePath');
console.log("dataFilePath: " + dataFilePath);

const fs = require('fs');
let order_limits = {};
let order_attendees = {};
fs.readFile(dataFilePath, 'utf8', (err, data) => {
  if ( err ) {
    if ( err.code === 'ENOENT') {
      console.log('File not found!');
      return;
    } else {
      throw err;
    }
  }
  console.log(data);
  data.split('\r\n').forEach(line => {
    if ( line != "") {
      const order = line.split(', ');
      console.log(D.dump(order));
      const eventbrite_order_id = order[0].toString();
      if (order_attendees[eventbrite_order_id] == undefined){
        order_limits[eventbrite_order_id] = order[1];
        order_attendees[eventbrite_order_id] = new Set();
        order_attendees[eventbrite_order_id].add(order[2]);
      } else {
        order_attendees[eventbrite_order_id].add(order[2]);
      }
    }
  });
});

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
  console.log(message.author.username);

  console.log("order_limits: " + D.dump(order_limits));
  console.log("order_attendees: " + D.dump(order_attendees));

  const re = /#(\d{10})([^\d]|$)/;
  if (( match_strings = re.exec(message.content)) !== null) {
    const eventbrite_order_id = match_strings[1];

    if ( order_attendees[eventbrite_order_id] ) {
    
      message.reply(eventbrite_order_id + "は" 
                  + order_limits[eventbrite_order_id] + "名分のうち、すでに" 
                  + order_attendees[eventbrite_order_id].size + "名が登録済みです。");

      if (order_limits[eventbrite_order_id] <= order_attendees[eventbrite_order_id].size &&
          !order_attendees[eventbrite_order_id].has(message.author.username)) {

        message.reply("あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。");
        return;

      }
    }
    
    axios.get('https://www.eventbriteapi.com/v3/orders/' 
          + eventbrite_order_id, 
            { headers: {
              Authorization: `Bearer ${process.env.EVENTBRITE_PRIVATE_KEY}`,
            }
    })
    .then(function (response) {
      console.log(eventbrite_order_id + ", " + response.status + ", " + response.data.name + ", " + response.data.status);
      fs.appendFileSync('process.log', "\r\n" + eventbrite_order_id + ", " + response.status + ", " + response.data.name + ", " + response.data.status + ", " + message.author.username);
      console.log(D.dump(response.data));
      console.log("event_id: " + response.data.event_id);

      if (response.data.event_id != process.env.EVENTBRITE_EVENT_ID) {
        message.reply(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)");
        return;
      }

      if ( response.data.status === "placed") {
        message.reply(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");

        axios.get('https://www.eventbriteapi.com/v3/orders/' 
                  + eventbrite_order_id
                  + '/attendees/', 
                  { headers: {
                    Authorization: `Bearer ${process.env.EVENTBRITE_PRIVATE_KEY}`,
                  }
        })
        .then(function (response) {
          console.log(D.dump(response.data.attendees));

          fs.appendFileSync(dataFilePath, "\r\n" + eventbrite_order_id + ", " + response.data.attendees.length + ", " + message.author.username);
          if (order_attendees[eventbrite_order_id] == undefined){
            order_attendees[eventbrite_order_id] = new Set();
          }
          order_attendees[eventbrite_order_id].add(message.author.username);
          order_limits[eventbrite_order_id] = response.data.attendees.length;
          message.reply(eventbrite_order_id + "は" + response.data.attendees.length + "名分のうち、" + order_attendees[eventbrite_order_id].size + "名が登録されています。");

        })
        .catch(function (error) {
          console.log(error);
          message.reply("あら、" + eventbrite_order_id + "はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。(" + error.response.status + ")");
        })    

      } else {
        if ( typeof (response.data.status) == "string" ) {
          message.reply(eventbrite_order_id + "は現在、有効ではありません。 status=" + response.data.status);
        } else {
          message.reply(eventbrite_order_id + "は現在、有効ではありません。");        
        }
        return;
      }

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
      message.reply("あら、" + eventbrite_order_id + "はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。(" + error.response.status + ")");
    })
  }
})

client.login(process.env.DISCORD_PRIVATE_KEY);


// for docker keep-alive in azure
const express = require('express')
const app = express()
const port = 8080

app.get('/', (req, res) => {
res.send('Hello World!')
})

app.listen(port, () => {
console.log(`Example app listening at http://localhost:${port}`)
})