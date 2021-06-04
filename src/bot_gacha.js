const BotBase = require('./bot_base')

class BotGacha extends BotBase {
  static PATTERNS = [
    /ガチャ\s*(\d+)?/,
    /ラッキーナンバー/,
    /[一1]\s?[人個つ].*選\S*\s(.+)/
  ]

  async commit() {
    const num = BotGacha.PATTERNS.findIndex(it => it.test(this.message.content))
    let msg = null
    if (num === 0) {
      msg = this.gacha()
    } else if (num === 1) {
      msg = `あなたのラッキーナンバーは ${this.getRandom(10)} です!!`
    } else if (num === 2) {
      msg = this.chooseOne()
    }
    this.reply(msg)
  }

  /**
   * 乱数を返す
   * 最大値が指定でき、省略時は 100 
   */
  gacha() {
    const result = BotGacha.PATTERNS[0].exec(this.message.content)
    return `こんなん出ましたぁ〜 ${this.getRandom(result[1] ?? 100)}`
  }

  /**
   * 選択肢の中から一つを選ぶ
   */
  chooseOne() {
    const result = BotGacha.PATTERNS[2].exec(this.message.content)
    const box = result[1].split(/[ 　,、\-ー:：]+/)
    console.log(result)
    console.log(box)
    return `おめでとう〜!! **${box[this.getRandom(box.length)]}** が選ばれました!`
  }
}


module.exports = BotGacha;
