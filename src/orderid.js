'use strict';

module.exports = (ordernumber) => {
    // check eventbrite_order_id format
    const re = /(\d{10})/;
    if ( re.exec(ordernumber) != null) {
        return re.exec(ordernumber)[1];
    } else {
        return false;
    }
}