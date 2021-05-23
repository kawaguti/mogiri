const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('config');
const {logger} = require('./src/logger')
const Unjash = require('./src/unjash');
const MogiriBot = require('./src/mogiri_bot');
const {isWatchChannel} = require('./src/mogiri');

client.once('ready', () => {
  logger.debug('This bot is online!');
})

client.on('message', async message => {
  if( message.author.bot) return;

  console.log("channel: " + message.channel.name);
  if(!isWatchChannel(message.channel.name)) return;

  const BOTS = [Unjash, MogiriBot]
  BOTS.forEach(CLS => await (new CLS(message)).commit(message.content))
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
