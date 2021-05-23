const MogiriMessage = require('./mogiri_message');

/**
 * 
 * @param {MogiriMessage} mm
 * @param {String} id           eventbrite order id
 * @param {object} order        eventbrite order object
 * @returns boolean
 * @deprecated
 */
function isValidOrderOnEventbrite2(mm, id, order) {
  const result = order.status === "placed"
  let options = ['VALID_ORDER_ON_EVENTBRITE', id]

  if (!result) {
    options = typeof(order.status) === 'string' ?
    ['INVALID_TICKET_STATUS_ON_EVENTBRITE_1', id, order.status]
    :
    ['INVALID_TICKET_STATUS_ON_EVENTBRITE_2', id, order.status]
  }

  mm.reply(...options);
  return result;
}
/**
 * @deprecated
 */
function isValidOrderOnEventbrite(message, eventbrite_order_id, response) {
  const res = new MogiriMessage(message);
  return isValidOrderOnEventbrite2(res, message, eventbrite_order_id, response.data)
}

/**
 * 
 * @param {MogiriMessage} mm 
 * @param {String} id     eventbrite order id
 * @param {object} order  eventbrite order object 
 * @param {object} current_event_id focused event of mogiri
 * @returns boolean
 * @deprecated
 */
function isForThisEvent2(mm, id, order, current_event_id) {
  const result = order.event_id == current_event_id

  if (result) {
    return true;
  }

  mm.reply('NOT_FOR_THIS_EVENT', id);
  return false;
}

/**
 * @deprecated
 */
function isForThisEvent(message, eventbrite_order_id, response, config) {
  const res = new MogiriMessage(message);
  return isForThisEvent2(res, eventbrite_order_id, response.data, config.eventbrite.eventId)
}

const W_CHANNELS = ['受付', '実行委員会', '品川']
function isWatchChannel(channel_name) {
  return W_CHANNELS.includes(channel_name)
}

module.exports = {
  isValidOrderOnEventbrite,
  isValidOrderOnEventbrite2,
  isForThisEvent2,
  isForThisEvent,
  isWatchChannel
}
