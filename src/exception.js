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

class NotFoundRoleInGuild extends MogiriError {
  constructor(role, ...params) {
    super(...params)
    this.message = `${role} のロールがサーバー上に見つかりませんでした。`
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

class NotFoundInInviteList extends MogiriError {
  constructor(...params) {
    super(...params)
    this.message = 'スタッフが確認しますのでお待ちください。'
  }
}

class UnknownNetworkError extends Error {
  constructor(status, ...params) {
    super(...params)
    this.message = `お腹が痛い…。困った…。 - (${status}) ${this.name} ${this.message}`
  }
}

module.exports = {
  MogiriError,
  NotFoundTicketError,
  NotForThisEventError,
  InvalidTicketStatusError,
  NotFoundRoleInGuild,
  NotFoundInInviteList,
  UnknownNetworkError
}
