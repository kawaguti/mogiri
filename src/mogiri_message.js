/*
Discord メッセージオブジェクト
message: {
  author: {
    bot:      '',
    username: ''
  },
  channel: {
    name:     ''
  },
  member: {
    roles: {
      cache: []
    }
  },
  guild: {
    roles: {
      cache: []
    }
  },
  content:  ''
  reply:    ''
}
*/

/**
 * Mogiri メッセージクリエーター
 * @deprecated
 */
class MogiriMessage {
  MSG_TABLE = {
    'NOT_FOR_THIS_EVENT':
      (...args) => `${args[0]}は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)`,
  
    'VALID_ORDER_ON_EVENTBRITE':
      (...args) => `${args[0]}は有効なEventbriteオーダー番号です。`,
  
    'OVER_COMMITTED_ON_THIS_ORDER':
      (...args) => 'あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。',
  
    'NOT_FOUND_ON_EVENTBRITE':
      (...args) => `あら、${args[0]}はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。(${args[1]})`,
  
    'INVALID_TICKET_STATUS_ON_EVENTBRITE_1':
      (...args) => `${args[0]}は現在、有効ではありません。 status=${args[1]}`,
  
    'INVALID_TICKET_STATUS_ON_EVENTBRITE_2':
      (...args) => `${args[0]}は現在、有効ではありません。`,
  }

  /**
   * Mogiri メッセージクリエーター
   * @param {object} message Discord Message Object
   */
  constructor(message) {
    this._discord_msg = message
  }
  get message() {return this._discord_msg}

  /**
   * Mogiri メッセージを作る
   * @param {String} code   Message Code of MSG_TABLE
   * @param {...any} args
   */
  create(code, ...args) {
    return this.MSG_TABLE[code] ? this.MSG_TABLE[code](...args) : 'パニック!'
  }

  /**
   * Discord メッセージへ返信する
   * @param {String} code   Message code of MSG_TABLE
   * @param {...any} args
   * @deprecated
   */
  reply(code, ...args) {
    this.message.reply(this.create(code, ...args))
  }
}

module.exports = MogiriMessage;
