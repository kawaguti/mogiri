const D = require('dumpjs');
const {logger} = require('./logger')

function dumpAttendeesOnThisOrder(response) {
  logger.debug(D.dump(response.data.attendees));
}

function dumpOrderStatus(eventbrite_order_id, response) {
  logger.debug(eventbrite_order_id + ", " + response.status + ", " + response.data.name + ", " + response.data.status);
  logger.debug(D.dump(response.data));
  logger.debug("event_id: " + response.data.event_id);
}

function dumpCurrentStore(message) {
  logger.debug(message.content);
  logger.debug(message.author.username);

  logger.debug("order_limits: " + D.dump(order_limits));
  logger.debug("order_attendees: " + D.dump(order_attendees));
}

module.exports = {
  dumpAttendeesOnThisOrder,
  dumpOrderStatus,
  dumpCurrentStore
}
