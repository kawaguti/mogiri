const MogiriBase = require('./mogiri_base')

class BotDoctorX extends MogiriBase {
  NETAS = [{
    pattern: /してください/,
    handler: (content) => 'いたしませ〜ん'
  }, {
    pattern: /議事録/,
    handler: (content) => 'それって医師免許、いりませんよね?!'
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


module.exports = BotDoctorX;
