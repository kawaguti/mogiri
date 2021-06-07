const {logger} = require('./logger')

class BotBase {
  #message    = null
  get message() { return this.#message }
  set message(v) { this.#message = v }

  get patterns() {
    throw new Error('You have to implement the getter patterns!')
  }

  /**
   * メッセージを処理する
   * @param {object} message Discord message object
   */
  async commit(message) {
    this.message = message

    this.patterns
      .map((it, idx) => ({idx, match: it.exec(this.message.content)}))
      .filter(it => !!it.match)
      .forEach(async it => {await this.run(it.idx, it.match)})
  }

  /**
   * パターンにマッチした返信処理をする
   * @param {!number} index index of match patterns
   * @param {!object} match result of RegExp#exec
   */
  async run(index, match) {
    throw new Error('You have to implement the method run!')
  }

  /**
   * 返信する
   * @param {!string} content reply message string
   */
  reply(content) {
    logger.info(content)
    this.message.reply(content)
  }

  /**
   * 乱数を返す
   * @param {?number}[max=100] maximum of range
   * @returns 
   */
  getRandom(max=100) {
    return Math.floor(Math.random() * max)
  }
}

module.exports = BotBase;
