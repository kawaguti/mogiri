const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('config');
const {logger} = require('./src/logger')
const BotTsukkomi = require('./src/bot_tsukkomi')
const BotGacha = require('./src/bot_gacha');
const MogiriBot = require('./src/mogiri_bot');

const W_CHANNELS = ['受付', '実行委員会', '品川', 'bot動作テスト用']
function isWatchChannel(channel_name) {
  return W_CHANNELS.includes(channel_name)
}

client.once('ready', () => {
  logger.debug('This bot is online!');
})

client.on('message', async message => {
  if( message.author.bot) return;

  console.log("channel: " + message.channel.name);
  if(!isWatchChannel(message.channel.name)) return;

  const BOTS = [BotTsukkomi, MogiriBot, BotGacha]
  BOTS.forEach(async CLS => {
    CLS.PATTERNS.find(it => it.test(message.content)) &&
      await (new CLS(message)).commit(message.content)
  })
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
