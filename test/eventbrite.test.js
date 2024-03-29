'use strict';

const should  = require('should');
const { conferences } = require('../config.json');
const axios = require('axios');

describe('eventbrite', function(){
    it('should be scrumfest-niigata if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "scrumfest-niigata";
        const eventbrite_order_id = "8925555029";
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
    it('should be scrumfest-fukuoka if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "scrumfest-fukuoka";
        const eventbrite_order_id = "8709431699";
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
    it('should be devopsdays-tokyo if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "devopsdays-tokyo";
        const eventbrite_order_id = "8553493369";
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
