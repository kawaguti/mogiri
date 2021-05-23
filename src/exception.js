class MogiriError extends Error {}

class NotFoundTicketError extends MogiriError {
  constructor(ticket, ...params) {
    super(...params)
    this.message = `あら、${ticket} はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。`
  }
}

class NotForThisEventError extends MogiriError {
  constructor(ticket, ...params) {
    super(...params)
    this.message = `${ticket} は有効なEventbriteオーダー番号ではありません。(他のイベントのチケット)`
  }
}

class InvalidTicketStatusError extends MogiriError {
  constructor(ticket, status, ...params) {
    super(...params)
    this.message = typeof(status) === 'string' ?
      `${ticket} は現在、有効ではありません。 status=${status}`
      :
      `${ticket} は現在、有効ではありません。`
  }
}

class UnknownNetworkError extends Error {
  constructor(status, ...params) {
    super(...params)
    this.message = `おっと、なんか通信エラーが発生したようだ。困ったぞ? - ${status}`
  }
}

module.exports = {
  MogiriError,
  NotFoundTicketError,
  NotForThisEventError,
  InvalidTicketStatusError,
  UnknownNetworkError
}
