const MogiriBase = require('./mogiri_base')

class BotUnjash extends MogiriBase {
  static PATTERNS = [
    /大島さん/,
    /児島さん/
  ]

  /**
   * @param {String} content
   * @deprecated
   */
  dispatch(content) {
    const   NETAS = [{
      pattern: /大島さん/,
      handler: (content) => '児島だよ'
    }, {
      pattern: /児島さん/,
      handler: (content) => 'そうだよ'
    }]
  
    for (const it of NETAS) {
      if (it.pattern.test(content)) {
        return it.handler(content)
      }
    }

    return null
  }

  /**
   * @param {String} content
   */
  async commit(content) {
    const MSGS = [
      `児島だよ!`,
      `そうだよ`
    ]
    const num = BotUnjash.PATTERNS.findIndex(it => it.test(content))
    this.message.reply(MSGS[num])
  }
}


module.exports = BotUnjash;
