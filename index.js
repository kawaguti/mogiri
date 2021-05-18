const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const D = require('dumpjs');
const config = require('config');

const log4js = require("log4js");
log4js.configure({
  appenders: {
    console: { type: 'console' },
    logfile: { type: 'file', filename: 'debug.log' },
  },
  categories: { default: { appenders: ['console', 'logfile'], level: 'debug' } }
});
const logger = log4js.getLogger();

var { order_limits, order_attendees, fs } = restoreOrders();

client.once('ready', () => {
  logger.debug('This bot is online!');
})

client.on('message', message => {
  if( message.author.bot) return;
  
  const re1 = /大島さん/;
  if ( re1.test(message.content) ){
    message.channel.send('児島だよ');
  }
  logger.debug(message.content);
  logger.debug(message.author.username);

  logger.debug("order_limits: " + D.dump(order_limits));
  logger.debug("order_attendees: " + D.dump(order_attendees));

  const re = /#(\d{10})([^\d]|$)/;
  if (( match_strings = re.exec(message.content)) !== null) {
    const eventbrite_order_id = match_strings[1];

    if ( order_attendees[eventbrite_order_id] ) {
    
      messageNumberOfUserOnThisOrder(message, eventbrite_order_id);

      if (order_limits[eventbrite_order_id] <= order_attendees[eventbrite_order_id].size &&
          !order_attendees[eventbrite_order_id].has(message.author.username)) {

        messageOverCommittedOnThisOrder(message);
        return;

      }
    }
    
    axios.get('https://www.eventbriteapi.com/v3/orders/' 
          + eventbrite_order_id, 
            { headers: {
              Authorization: `Bearer ${config.eventbrite.privateKey}`,
            }
    })
    .then(function (response) {
      logger.debug(eventbrite_order_id + ", " + response.status + ", " + response.data.name + ", " + response.data.status);
      logger.debug(D.dump(response.data));
      logger.debug("event_id: " + response.data.event_id);

      if (response.data.event_id != config.eventbrite.eventId) {
        messageNotForThisEvent(message, eventbrite_order_id);
        return;
      }

      if ( response.data.status === "placed") {
        messageValidOrderOnEventbrite(message, eventbrite_order_id);

        axios.get('https://www.eventbriteapi.com/v3/orders/' 
                  + eventbrite_order_id
                  + '/attendees/', 
                  { headers: {
                    Authorization: `Bearer ${config.eventbrite.privateKey}`,
                  }
        })
        .then(function (response) {
          logger.debug(D.dump(response.data.attendees));

          addOrder(eventbrite_order_id, response, message);

        })
        .catch(function (error) {
          logger.debug(error);
          messageNotFoundOnEventbrite(message, eventbrite_order_id, error);
        })    

      } else {
        messageInvalidTicketStatusOnEventbrite(response, message, eventbrite_order_id);
        return;
      }

      setDiscordRole(message);
    })
    .catch(function (error) {
      logger.debug(error);
      messageNotFoundOnEventbrite(message, eventbrite_order_id, error);
    })
  }
})

client.login(config.discord.privateKey);


// for docker keep-alive in azure
const express = require('express')
const app = express()
const port = 8080

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  logger.debug(`http listening at http://localhost:${port}`)
})

function messageNumberOfUserOnThisOrder(message, eventbrite_order_id) {
  message.reply(eventbrite_order_id + "は"
    + order_limits[eventbrite_order_id] + "名分のうち、すでに"
    + order_attendees[eventbrite_order_id].size + "名が登録済みです。");
}

function messageValidOrderOnEventbrite(message, eventbrite_order_id) {
  message.reply(eventbrite_order_id + "は有効なEventbriteオーダー番号です。");
}

function messageOverCommittedOnThisOrder(message) {
  message.reply("あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。");
}

function messageInvalidTicketStatusOnEventbrite(response, message, eventbrite_order_id) {
  if (typeof (response.data.status) == "string") {
    message.reply(eventbrite_order_id + "は現在、有効ではありません。 status=" + response.data.status);
  } else {
    message.reply(eventbrite_order_id + "は現在、有効ではありません。");
  }
}

function messageNotForThisEvent(message, eventbrite_order_id) {
  message.reply(eventbrite_order_id + "は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)");
}

function messageNotFoundOnEventbrite(message, eventbrite_order_id, error) {
  message.reply("あら、" + eventbrite_order_id + "はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。(" + error.response.status + ")");
}

function setDiscordRole(message) {
  const role = message.guild.roles.cache.find(role => role.name === config.discord.roleForValidUser);
  if (role) {
    if (message.member.roles.cache.some(role => role.name === config.discord.roleForValidUser)) {
      message.reply("すでに" + role.name + "のロールをお持ちでした！");
    } else {
      message.member.roles.add(role);
      message.reply(role.name + "のロールをつけました！");
    }
  }
}

function addOrder(eventbrite_order_id, response, message) {
  fs.appendFileSync(config.data.filePath, "\r\n" + eventbrite_order_id + ", " + response.data.attendees.length + ", " + message.author.username);
  if (order_attendees[eventbrite_order_id] == undefined) {
    order_attendees[eventbrite_order_id] = new Set();
  }
  order_attendees[eventbrite_order_id].add(message.author.username);
  order_limits[eventbrite_order_id] = response.data.attendees.length;
  message.reply(eventbrite_order_id + "は" + response.data.attendees.length + "名分のうち、" + order_attendees[eventbrite_order_id].size + "名が登録されています。");
}

function restoreOrders() {
  const fs = require('fs');
  let order_limits = {};
  let order_attendees = {};
  logger.debug("dataFilePath: " + config.data.filePath);
  fs.readFile(config.data.filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        logger.debug('File not found!');
        return;
      } else {
        throw err;
      }
    }
    //logger.debug(data);
    data.split('\r\n').forEach(line => {
      if (line != "") {
        const order = line.split(', ');
        //logger.debug(D.dump(order));
        const eventbrite_order_id = order[0].toString();
        if (order_attendees[eventbrite_order_id] == undefined) {
          order_limits[eventbrite_order_id] = order[1];
          order_attendees[eventbrite_order_id] = new Set();
          order_attendees[eventbrite_order_id].add(order[2]);
        } else {
          order_attendees[eventbrite_order_id].add(order[2]);
        }
      }
    });
  });
  return { order_limits, order_attendees, fs };
}
