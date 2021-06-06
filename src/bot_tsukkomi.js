const fs = require('fs');
const YAML = require('yaml');
const {logger} = require('./logger')
const BotBase = require("./bot_base");

const VOCABULARIES_FILE = './resource/vocabulary.yaml'
const VOCABULARIES = YAML
  .parse(fs.readFileSync(VOCABULARIES_FILE, 'utf8'))
  .map(it => {
    return {regex: new RegExp(it.word), replies: it.replies}
  })

/**
 * ツッコミボット
 * 概要:
 * - パターンにマッチしたメッセージがあれば、それに紐づくツッコミを返します。
 * - 複数のツッコミのうちからランダムに一つを選んで返信します。
 * - 決まった言葉のみ返信できます。変数は使えません。
 * - 変数を使いたい場合は、新たなクラスを起こしてください。
 */

class BotTsukkomi extends BotBase {
  get patterns() { return VOCABULARIES.map(it => it.regex) }

  async commit(message) {
    if (message.content.length > 50) {
      logger.warn(`too long content`)
      return
    }
    await super.commit(message)
  }

  async run(index, match) {
    const box = VOCABULARIES[index].replies
    this.reply(box[this.getRandom(box.length)])
  }
}


module.exports = BotTsukkomi;
