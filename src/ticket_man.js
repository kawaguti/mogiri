const LocalStorage = require('node-localstorage').LocalStorage;
const axios = require('axios');
const config = require('config');
const {MogiriError, NotFoundTicketError, NotForThisEventError, InvalidTicketStatusError, UnknownNetworkError} = require('./exception')

const EVENTBRITE_HOST = ('development', 'test').includes(process.env.NODE_ENV)
  ? 'http://localhost:3000' : 'https://www.eventbriteapi.com'

/**
 * Eventbrite チケット
 */
class EbTicket {
  constructor(raw) {
    this._raw       = {id: null, limit: null, attendees: []}
    this._event_id  = null
    this._status    = null

    if (raw) {
      this._raw.id        = raw.id
      this._raw.limit     = raw.limit ?? null
      this._raw.attendees = raw.attendees ?? []
      this._event_id      = raw.event_id ?? null
      this._status        = raw.status ?? null
    }
  }
  get raw()           { return this._raw }
  get id()            { return this._raw.id }
  get event_id()      { return this._event_id }
  get status()        { return this._status }
  get limit()         { return this._raw.limit }
  get attendees()     { return this._raw.attendees }
  get isEffective()   { return this.limit !== null }
  get isFull()        { return !this.isEffective || this.limit < this.attendees.length }

  set attendees(data) { this._raw.attendees = data }
  set limit(data)     { this._raw.limit = data }

  get info()          {
    return `${this.id} は ${this.limit} 名分のうち、${this.attendees.length} 名が登録済みです。`
  }

  /**
   * チケット登録済みを確認する
   * @param {!String} name
   * @returns 
   */
  isRegisterd(name) {
    return this.attendees.includes(name)
  }

  /**
   * チケットに紐づくアカウントを追加する
   * @param {!String} name username of discord.
   */
  addAttendance(name) {
    this.attendees = [...new Set(this.attendees.concat(name))].sort()
  }

  /**
   * Eventbrite にチケット番号を問い合わせる
   * @param {!String} ticket 
   * @returns {EbTicket}
   * @throws {NotFoundTicketError}  http status 404
   * @throws {NotForThisEventError}
   * @throws {InvalidTicketStatusError} status is not 'placed'
   * @throws {UnknownNetworkError}
   */
  static async reference(ticket, event) {
    try {
      /* チケット問い合わせ - イベント id 確認 */
      const response1 = await axios.get(`${EVENTBRITE_HOST}/v3/orders/${ticket}`, {
        headers: {
        Authorization: `Bearer ${config.eventbrite.privateKey}`
      }})

      if(response1.data.event_id !== event) {
        throw new NotForThisEventError(ticket)
      }

      if(response1.data.status !== 'placed') {
        throw new InvalidTicketStatusError(ticket, response1.data.status)
      }

      /* 定員数問い合わせ */
      const response2 = await axios.get(`${EVENTBRITE_HOST}/v3/orders/${ticket}/attendees/`, {
        headers: {
          Authorization: `Bearer ${config.eventbrite.privateKey}`
      }})

      return new EbTicket({
        id: ticket,
        limit: response2.data.attendees.length
      })
    } catch (error) {
      if (error instanceof MogiriError) {
        throw error;
      }
      if (error.response.status === 404) {
        throw new NotFoundTicketError(ticket)
      }
      throw new UnknownNetworkError(error.response.status)
    }
  }
}

class TicketWarehouse {
  constructor(filepath, event_id) {
    this._storage   = new LocalStorage(filepath)
    this._event_id  = event_id
    this._warehouse = JSON.parse(this._storage.getItem(event_id))
  }

  //TODO: 永続化の必要なパターンを網羅されてる?
  addEbTicket(ticket) {
    this._warehouse = this._warehouse ?? {}
    this._warehouse[ticket.id] = ticket.raw
    this.freeze()
  }

  getEbTicket(id) {
    const raw = this._warehouse[id] ?? null;
    return raw && new EbTicket(raw)
  }

  freeze() {
    this._storage.setItem(this._event_id, JSON.stringify(this._warehouse))
  }

  reset() {
    this._storage.clear()
  }
}


module.exports = {
  EbTicket,
  TicketWarehouse
}
