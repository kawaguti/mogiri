const Discord = require('discord.js');
const Unjash = require('./src/unjash');
const MogiriMessage = require('./src/mogiri_message');
const client = new Discord.Client();
const axios = require('axios');
const D = require('dumpjs');
const config = require('config');
const {logger} = require('./src/logger')
const {dumpAttendeesOnThisOrder, dumpOrderStatus, dumpCurrentStore} = reqire('./src/matsumoto')
const {isValidOrderOnEventbrite, isForThisEvent} = require('./src/mogiri')

var { order_limits, order_attendees, fs } = restoreOrders();

client.once('ready', () => {
  logger.debug('This bot is online!');
})

client.on('message', message => {
  if( message.author.bot) return;
  
  console.log("channel: " + message.channel.name);
  if( !(
      message.channel.name === "受付" || 
      message.channel.name === "実行委員会" || 
      message.channel.name === "品川"
      )) return;

  const kojima = new Unjash()
  const tsukkomi = kojima.dispatch(message.content)
  tsukkomi && message.reply(tsukkomi)

  //dumpCurrentStore(message);

  const re = /#(\d{10})([^\d]|$)/;
  if (( match_strings = re.exec(message.content)) !== null) {
    const eventbrite_order_id = match_strings[1];

    if ( isOverCommittedOnThisOrder(eventbrite_order_id, message)) {
      return;
    }
    
    axios.get('https://www.eventbriteapi.com/v3/orders/' 
          + eventbrite_order_id, 
            { headers: {
              Authorization: `Bearer ${config.eventbrite.privateKey}`,
            }
    })
    .then(function (response) {
      //dumpOrderStatus(eventbrite_order_id, response);

      if ( isForThisEvent(message, eventbrite_order_id, response) &&
          isValidOrderOnEventbrite(message, eventbrite_order_id, response)) {

        axios.get('https://www.eventbriteapi.com/v3/orders/' 
                  + eventbrite_order_id
                  + '/attendees/', 
                  { headers: {
                    Authorization: `Bearer ${config.eventbrite.privateKey}`,
                  }
        })
        .then(function (response) {
          dumpAttendeesOnThisOrder(response);
          addOrder(eventbrite_order_id, response, message);
          setDiscordRole(message);
          messageNumberOfUserOnThisOrder(message, eventbrite_order_id);
        })
        .catch(function (error) {
          logger.debug(error);
          const mm = new MogiriMessage(message);
          mm.reply('NOT_FOUND_ON_EVENTBRITE', eventbrite_order_id, error.response.status);
        })    
      }
    })
    .catch(function (error) {
      logger.debug(error);
      const mm = new MogiriMessage(message);
      mm.reply('NOT_FOUND_ON_EVENTBRITE', eventbrite_order_id, error.response.status);
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

function isOverCommittedOnThisOrder(eventbrite_order_id, message) {
  if ( order_attendees[eventbrite_order_id] === undefined) { 
    message.reply(eventbrite_order_id + "は初めての問い合わせです。");
    return false;
  }
  if ( order_attendees[eventbrite_order_id].has(message.author.username)) {
    message.reply(eventbrite_order_id + "で" + message.author.username + "さんは前に処理した記録がありますが、念のためもう一回確認しますね。");
    return false;
  }
  if ( order_attendees[eventbrite_order_id].size < order_limits[eventbrite_order_id] ) {
    messageNumberOfUserOnThisOrder(message, eventbrite_order_id);
    return false;
  }

  const mm = new MogiriMessage(message);
  mm.reply('OVER_COMMITTED_ON_THIS_ORDER');
  return true;
}

function messageNumberOfUserOnThisOrder(message, eventbrite_order_id) {
  if (order_attendees[eventbrite_order_id] ) {
    message.reply(eventbrite_order_id + "は"
    + order_limits[eventbrite_order_id] + "名分のうち、"
    + order_attendees[eventbrite_order_id].size + "名が登録済みです。");
  } else {
    message.reply(eventbrite_order_id + "は初めての登録です。");
  }
}

function setDiscordRole(message) {
  const role = message.guild.roles.cache.find(role => role.name === config.discord.roleForValidUser);
  if (role) {
    if (message.member.roles.cache.some(role => role.name === config.discord.roleForValidUser)) {
      logger.info("すでに" + role.name + "のロールをお持ちでした！");
      message.reply("すでに" + role.name + "のロールをお持ちでした！");
    } else {
      message.member.roles.add(role);
      logger.info(role.name + "のロールをつけました！");
      message.reply(role.name + "のロールをつけました！");
    }
  } else {
    logger.info(config.discord.roleForValidUser + "のロールがサーバー上に見つかりませんでした");
    message.reply(config.discord.roleForValidUser + "のロールがサーバー上に見つかりませんでした");
  }
}

function addOrder(eventbrite_order_id, response, message) {
  fs.appendFileSync(config.data.filePath, "\r\n" + eventbrite_order_id + ", " + response.data.attendees.length + ", " + message.author.username);
  if (order_attendees[eventbrite_order_id] == undefined) {
    order_attendees[eventbrite_order_id] = new Set();
  }
  order_attendees[eventbrite_order_id].add(message.author.username);
  order_limits[eventbrite_order_id] = response.data.attendees.length;
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
