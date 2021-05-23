const MogiriBase = require('./mogiri_base')

class MilkBoy extends MogiriBase {
  NETAS = [{
    pattern: /忘れ(た|てしまった|ました)/,
    handler: (content) => 'ほな、オレが一緒に考えてあげよ。'
  }, {
    pattern: /違う/,
    handler: (content) => '違うことあれへんがな!!'
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


module.exports = MilkBoy;
