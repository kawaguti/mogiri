const MogiriBase = require('./mogiri_base')

class BotMilkBoy extends MogiriBase {
  static PATTERNS = [
    /忘れ(た|ました|てしまった|てもーた)/,
    /違う/
  ]

  /**
   * @param {String} content
   */
  async commit(content) {
    const MSGS = [
      `ほな、オレが一緒に考えてあげよ。`,
      `違うことあれへんがな!!`
    ]
    const num = BotMilkBoy.PATTERNS.findIndex(it => it.test(content))
    this.message.reply(MSGS[num])
  }
}


module.exports = BotMilkBoy;
