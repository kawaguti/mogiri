const DiscoResponse = require('./src/disco_response');

function isValidOrderOnEventbrite(message, eventbrite_order_id, response) {
  const res = new DiscoResponse(message);
  if ( response.data.status === "placed" ) {
    res.reply('VALID_ORDER_ON_EVENTBRITE', eventbrite_order_id);
    return true;
  } else {
    const CODE = typeof(response.data.status) === 'string' ?
    'INVALID_TICKET_STATUS_ON_EVENTBRITE_1' : 'INVALID_TICKET_STATUS_ON_EVENTBRITE_2';

    res.reply(CODE, eventbrite_order_id, response.data.status);
    return false;
  }
}

function isForThisEvent(message, eventbrite_order_id, response, config) {
  if ( response.data.event_id == config.eventbrite.eventId ) {
    return true;
  } else {
    const dp = new DiscoResponse(message);
    dp.reply('NOT_FOR_THIS_EVENT', eventbrite_order_id);
    return false;
  }
}

function isOverCommittedOnThisOrder(eventbrite_order_id, message, order_attendees) {
  if ( order_attendees[eventbrite_order_id] === undefined) { 
    message.reply(eventbrite_order_id + "は初めての問い合わせです。");
    return false;
  }
  if ( order_attendees[eventbrite_order_id].has(message.author.username)) {
    message.reply(eventbrite_order_id + "で" + message.author.username + "さんは前に処理した記録がありますが、念のためもう一回確認しますね。");
    return false;
  }
  if ( order_attendees[eventbrite_order_id].size < order_limits[eventbrite_order_id] ) {
    messageNumberOfUserOnThisOrder(message, eventbrite_order_id, order_attendees);
    return false;
  }

  const res = new DiscoResponse(message);
  res.reply('OVER_COMMITTED_ON_THIS_ORDER');
  return true;
}

function messageNumberOfUserOnThisOrder(message, eventbrite_order_id, order_attendees) {
  if (order_attendees[eventbrite_order_id] ) {
    message.reply(eventbrite_order_id + "は"
    + order_limits[eventbrite_order_id] + "名分のうち、"
    + order_attendees[eventbrite_order_id].size + "名が登録済みです。");
  } else {
    message.reply(eventbrite_order_id + "は初めての登録です。");
  }
}

module.exports = {
  isValidOrderOnEventbrite,
  isForThisEvent,
  isOverCommittedOnThisOrder,
  messageNumberOfUserOnThisOrder
}
