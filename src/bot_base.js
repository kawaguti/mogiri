const {logger} = require('./logger')

class BotBase {
  static PATTERNS = []
  constructor(message) {
    this._message = message;
  }
  get message() { return this._message; }

  async commit() {
    throw new Error('You have to implement the method commit!');
  }

  reply(str) {
    logger.info(str);
    this.message.reply(str);
  }

  getRandom(max) {
    return Math.floor(Math.random() * max)
  }
}

module.exports = BotBase;
