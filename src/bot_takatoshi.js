const MogiriBase = require('./mogiri_base')

class BotTakatoshi extends MogiriBase {
  static PATTERNS = [
    /ミルク/,
    /うっかり/
  ]

  /**
   * @param {String} content
   */
  async commit(content) {
    const MSGS = [
      `欧米か!`,
      `八兵衛か!`
    ]
    const num = BotTakatoshi.PATTERNS.findIndex(it => it.test(content))
    this.message.reply(MSGS[num])
  }
}


module.exports = BotTakatoshi;
