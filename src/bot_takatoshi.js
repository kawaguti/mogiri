const MogiriBase = require('./mogiri_base')

class BotTakatoshi extends MogiriBase {
  NETAS = [{
    pattern: /ミルク/,
    handler: (content) => '欧米か!'
  }, {
    pattern: /うっかり/,
    handler: (content) => '八兵衛か!'
  }]

  /**
   * @param {String} content
   */
  commit(content) {
    let msgs = this.NETAS
    .map(it => it.pattern.test(content) && it.handler(content))
    .filter(it => it !== false)

    msgs.forEach(it => this.message.reply(it))
  }
}


module.exports = BotTakatoshi;
