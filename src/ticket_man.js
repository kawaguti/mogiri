const LocalStorage = require('node-localstorage').LocalStorage;

/**
 * Eventbrite チケット
 */
class EbTicket {
  constructor(raw) {
    this._raw = raw ?? {id: null, limit: null, attendees: []}
  }
  get raw()           { return this._raw }
  get id()            { return this._raw.id }
  get limit()         { return this._raw.limit }
  get attendees()     { return this._raw.attendees }
  get isEffective()   { return this.limit !== null }
  get isFull()        { return !this.isEffective || this.limit < this.attendees.length }
  set attendees(data) { this._raw.attendees = data }

  /**
   * チケットに紐づくアカウントを追加する
   * @param {String} name username of discord.
   */
  addAttendance(name) {
    this.attendees = [...new Set(this.attendees.concat(name))].sort()
  }
}

class TicketWarehouse {
  constructor(filepath, event_id) {
    this._storage = new LocalStorage(filepath)
    this._event_id = event_id
    this._warehouse = JSON.parse(this._storage.getItem(event_id))
  }

  addEbTicket(ticket) {
    this._warehouse = this._warehouse ?? {}
    this._warehouse[ticket.id] = ticket.raw
    this.freeze()
  }

  getEbTicket(id) {
    return new EbTicket(this._warehouse[id])
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

