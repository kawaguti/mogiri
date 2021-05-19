class DiscoProxy {
  constructor(message) {
    this._message = message
  }
  get message() {return this._message}
  /**
   * @param {*} id eventbrite order id 
   */
  messageNotForThisEvent(id) {
    this.message.reply(`${id}は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)`);
  }

  /**
   * @param {*} id eventbrite order id 
   */
  messageValidOrderOnEventbrite(id) {
    this.message.reply(`${id}は有効なEventbriteオーダー番号です。`);
  }
}

module.exports = DiscoProxy;
