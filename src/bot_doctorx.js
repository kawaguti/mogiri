const MogiriBase = require('./mogiri_base')

class BotDoctorX extends MogiriBase {
  static PATTERNS = [/(てくだ|な)さい/, /できますか/]

  /**
   * @param {String} content
   */
  async commit(content) {
    const MSGS = [[
      'いたしませ〜ん',
      'それって医師免許、いりませんよね?!'
    ], [
      '私、失敗しませんから'
    ]]
    const num = BotDoctorX.PATTERNS.findIndex(it => it.test(content))
    const box = MSGS[num]
    this.message.reply(box[this.getRandom(box.length)])
  }
}


module.exports = BotDoctorX;
