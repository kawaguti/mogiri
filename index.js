const Discord = require('discord.js');
const config = require('config');
const {logger} = require('./src/logger')
const BotTsukkomi = require('./src/bot_tsukkomi')
const BotGacha = require('./src/bot_gacha');
const BotMogiri = require('./src/bot_mogiri');

const client = new Discord.Client();

const W_CHANNELS = config.discord.observation ?? ["受付", "実行委員会", "品川"]
function isWatchChannel(channel_name) {
  return W_CHANNELS.includes(channel_name)
}

client.once('ready', () => {
  logger.debug('This bot is online!');
  logger.debug(`start observating ${W_CHANNELS}`)
})

client.on('message', async message => {
  if( message.author.bot) return;

  console.log("channel: " + message.channel.name);
  if(!isWatchChannel(message.channel.name)) return;

  const BOTS = [BotTsukkomi, BotMogiri, BotGacha]
  BOTS.forEach(async CLS => {
    CLS.PATTERNS.find(it => it.test(message.content)) &&
      await (new CLS(message)).commit()
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
