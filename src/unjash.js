const MogiriBase = require('./mogiri_base')

class Unjash extends MogiriBase {
  NETAS = [{
    pattern: /大島さん/,
    handler: (content) => '児島だよ'
  }, {
    pattern: /児島さん/,
    handler: (content) => 'そうだよ'
  }]

  /**
   * @param {String} content
   * @deprecated
   */
  dispatch(content) {
    for (const it of this.NETAS) {
      if (it.pattern.test(content)) {
        return it.handler(content)
      }
    }

    return null
  }

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


module.exports = Unjash;
