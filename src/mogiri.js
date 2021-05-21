const MogiriMessage = require('./mogiri_message');

/**
 * 
 * @param {MogiriMessage} mm
 * @param {String} id           eventbrite order id
 * @param {object} response     
 * @returns boolean
 */
function isValidOrderOnEventbrite2(mm, id, response) {
  if ( response.data.status === "placed" ) {
    mm.reply('VALID_ORDER_ON_EVENTBRITE', id);
    return true;
  } else {
    const CODE = typeof(response.data.status) === 'string' ?
    'INVALID_TICKET_STATUS_ON_EVENTBRITE_1' : 'INVALID_TICKET_STATUS_ON_EVENTBRITE_2';

    mm.reply(CODE, id, response.data.status);
    return false;
  }
}
/**
 * @deprecated
 */
function isValidOrderOnEventbrite(message, eventbrite_order_id, response) {
  const res = new MogiriMessage(message);
  return isValidOrderOnEventbrite2(res, message, eventbrite_order_id, response)
}

/**
 * 
 * @param {MogiriMessage} mm 
 * @param {String} id         eventbrite order id
 * @param {object} response 
 * @param {object} config 
 * @returns boolean
 */
function isForThisEvent2(mm, id, response, config) {
  if ( response.data.event_id == config.eventbrite.eventId ) {
    return true;
  } else {
    mm.reply('NOT_FOR_THIS_EVENT', id);
    return false;
  }
}
/**
 * @deprecated
 */
function isForThisEvent(message, eventbrite_order_id, response, config) {
  const res = new MogiriMessage(message);
  return isForThisEvent2(res, eventbrite_order_id, response, config)
}

module.exports = {
  isValidOrderOnEventbrite,
  isValidOrderOnEventbrite2,
  isForThisEvent2,
  isForThisEvent
}
