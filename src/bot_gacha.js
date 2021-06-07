const {logger} = require('./logger')
const BotBase = require('./bot_base')

const PATTERNS = [
  /(ガチャ|gacha)\s*(?<max>\d+)?/,
  /ラッキーナンバー/,
  /([一1]\s?[人個つ]|(どこ|誰|どれ|なに|何)).*選\S*[\s　]+(?<option>.+)/,
  /(calc|計算|集計|合計)\S*\s+(?<exp>[\d(][\d\+\-\*\/\s(\))]*)/
]

class BotGacha extends BotBase {
  get patterns() { return PATTERNS }

  /**
   * 
   * @param {number} index index of match patterns
   * @param {object} match result of RegExp#exec
   */
  async run(index, match) {
    const FUNCS = [
      this.gacha,
      () => `あなたのラッキーナンバーは ${this.getRandom(10)} です!!`,
      this.chooseOne,
      this.calc
    ]
    try {
      let msg = FUNCS[index].call(this, match)
      this.reply(msg)
    } catch (error) {
      logger.error(error.message)
      this.reply('むむむ…。これは計算できない…。 (><)')
    }
  }

  /**
   * 乱数を返す
   * 最大値が指定でき、省略時は 100
   * @param {object} match result of RegExp#exec
   * @returns {string} message for reply
   */
  gacha(match) {
    return `こんなん出ましたぁ〜 **${this.getRandom(match.groups.max ?? 100)}**`
  }

  /**
   * 選択肢の中から選んだ一つを返す
   * @param {object} match result of RegExp#exec
   * @returns {string} message for reply
   */
  chooseOne(match) {
    const box = match.groups.option.split(/[ 　,、\-:：]+/)
    return `おめでとう〜!! **${box[this.getRandom(box.length)]}** が選ばれました!`
  }

  /**
   * 四則演算の結果を返す
   * @param {object} match result of RegExp#exec
   * @returns {string} message for reply
   */
  calc(match) {
    return `カタカタ…結果は…こちら! ---> **${eval(match.groups.exp)}**`
  }
}


module.exports = BotGacha;
