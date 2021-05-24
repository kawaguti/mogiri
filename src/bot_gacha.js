const MogiriBase = require('./mogiri_base')

class BotGacha extends MogiriBase {
  NETAS = [{
    pattern: /ガチャ/,
    handler: (content) => `こんなん出ましたぁ〜 ${parseInt(Math.random() *100)}`
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


module.exports = BotGacha;
