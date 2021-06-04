const BotBase = require('./bot_base')

class BotGacha extends BotBase {
  static PATTERNS = [
    /(ガチャ|gacha)\s*(?<max>\d+)?/,
    /ラッキーナンバー/,
    /[一1]\s?[人個つ].*選\S*\s+(.+)/,
    /(calc|計算)\S*\s+(?<exp>\d[\d\+\-\*\/\s]+)/
  ]

  async commit() {
    const num = BotGacha.PATTERNS.findIndex(it => it.test(this.message.content))

    try {
      let msg = null
      if (num === 0) {
        msg = this.gacha()
      } else if (num === 1) {
        msg = `あなたのラッキーナンバーは ${this.getRandom(10)} です!!`
      } else if (num === 2) {
        msg = this.chooseOne()
      } else if (num === 3) {
        msg = this.calc()
      }
      this.reply(msg)
    } catch (error) {
      this.reply(error.message)
    }
  }

  /**
   * 乱数を返す
   * 最大値が指定でき、省略時は 100 
   */
  gacha() {
    const result = BotGacha.PATTERNS[0].exec(this.message.content)
    return `こんなん出ましたぁ〜 ${this.getRandom(result.groups.max ?? 100)}`
  }

  /**
   * 選択肢の中から一つを選ぶ
   */
  chooseOne() {
    const result = BotGacha.PATTERNS[2].exec(this.message.content)
    const box = result[1].split(/[ 　,、\-ー:：]+/)
    return `おめでとう〜!! **${box[this.getRandom(box.length)]}** が選ばれました!`
  }

  calc() {
    const result = BotGacha.PATTERNS[3].exec(this.message.content)
    return `カタカタ…結果は…こちら! ${eval(result.groups.exp)}`
  }
}


module.exports = BotGacha;
