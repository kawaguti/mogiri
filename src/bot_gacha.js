const MogiriBase = require('./mogiri_base')

class BotGacha extends MogiriBase {
  static PATTERNS = [/ガチャ/, /ラッキーナンバー/]

  async commit() {
    const MSGS = [
      `こんなん出ましたぁ〜 ${this.getRandom(100)}`,
      `あなたのラッキーナンバーは ${this.getRandom(10)} です!!`
    ]
    const num = BotGacha.PATTERNS.findIndex(it => it.test(this.message.content))
    this.message.reply(MSGS[num])
  }
}


module.exports = BotGacha;
