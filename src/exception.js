class MogiriError extends Error {}

class NotFoundTicketError extends MogiriError {
  constructor(ticket, ...params) {
    super(...params)
    this.message = `あら、受付番号${ticket} が見当たりませんでした。7桁の受付番号をご確認ください。`
  }
}

class UsedTicketError extends MogiriError {
  constructor(ticket, ...params) {
    super(...params)
    this.message = `あら、受付番号${ticket} はすでに利用済のようです。スタッフが確認いたします。少々お待ちください。`
  }
}

class NotFoundRoleInGuild extends MogiriError {
  constructor(role, ...params) {
    super(...params)
    this.message = `${role} のロールがサーバー上に見つかりませんでした。`
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
  UsedTicketError,
  NotFoundRoleInGuild,
  UnknownNetworkError
}
