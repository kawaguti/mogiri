'use strict';

const should  = require('should');
const { conferences } = require('../config.json');
const axios = require('axios');

describe('eventbrite', function(){
    it('should be scrum-fest-fukuoka if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "scrum-fest-fukuoka";
        const eventbrite_order_id = "5836579059";
        axios.get('https://www.eventbriteapi.com/v3/orders/'
        + eventbrite_order_id,
        { headers: {
            Authorization: `Bearer ${conferences[conference_name].eventbrite_private_key}`,
        }
        })
        .then(function (response) {
            response.data.event_id.should.equal(conferences[conference_name].eventbrite_event_id);
        });
    });

});
