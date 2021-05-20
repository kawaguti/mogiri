const MSG_TABLE = {
  'NOT_FOR_THIS_EVENT':
    (id) => `${id}は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)`,
  'VALID_ORDER_ON_EVENTBRITE':
    (id) => `${id}は有効なEventbriteオーダー番号です。`,
  'OVER_COMMITTED_ON_THIS_ORDER':
    () => 'あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。',
  'NOT_FOUND_ON_EVENTBRITE':
    (id, status) => `あら、${id}はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。(${status})`,
  'INVALID_TICKET_STATUS_ON_EVENTBRITE_1':
    (id, status) => `${id}は現在、有効ではありません。 status=${status}`,
  'INVALID_TICKET_STATUS_ON_EVENTBRITE_2':
    (id) => `${id}は現在、有効ではありません。`,
}

class DiscoResponse {
  constructor(message) {
    this._message = message
  }
  get message() {return this._message}

  /**
   * @param {String} id eventbrite order id
   * @deprecated
   */
  messageNotForThisEvent(id) {
    this.message.reply(MSG_TABLE['NOT_FOR_THIS_EVENT'](id))
  }

  /**
   * @param {String} id eventbrite order id
   * @deprecated
   */
  messageValidOrderOnEventbrite(id) {
    this.message.reply(MSG_TABLE['VALID_ORDER_ON_EVENTBRITE'](id))
  }

  /**
   * @deprecated
   */
  messageOverCommittedOnThisOrder() {
    this.message.reply(MSG_TABLE['OVER_COMMITTED_ON_THIS_ORDER']())
  }

  /**
   * @param {String} id eventbrite order id
   * @param {String} status eventbrite error status code
   * @deprecated
   */
  messageNotFoundOnEventbrite(id, status) {
    this.message.reply(MSG_TABLE['NOT_FOUND_ON_EVENTBRITE'](id, status))
  }

  /**
   * @param {String} id eventbrite order id
   * @param {*} status eventbrite data status code
   * @deprecated
   */
  messageInvalidTicketStatusOnEventbrite(id, status) {
    typeof(status) === 'string' ?
      this.message.reply(MSG_TABLE['INVALID_TICKET_STATUS_ON_EVENTBRITE_1'](id, status))
    : this.message.reply(MSG_TABLE['INVALID_TICKET_STATUS_ON_EVENTBRITE_2'](id))
  }
}

module.exports = DiscoResponse;
