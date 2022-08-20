'use strict';

const should  = require('should');
const { conferences } = require('../config.json');
const axios = require('axios');

describe('eventbrite', function(){
    it('should be scrumfest-mikawa if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "scrumfest-mikawa";
        const eventbrite_order_id = conferences[conference_name].ordernumber_for_test;
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
    it('should be rsgt2023 if ordernumber is $ordernumber_for_test', function(){
        const conference_name = "rsgt2023";
        const eventbrite_order_id = "4347745859";
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
