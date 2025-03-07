'use strict';

const should = require('should');
const { conferences } = require('../config.json');
const checkEventbriteOrder = require('../src/eventbrite.js');

describe('eventbrite', function() {
    // config.jsonに定義されているすべてのカンファレンスをテスト
    Object.entries(conferences).forEach(([conference_name, conference]) => {
        // Eventbriteのカンファレンスのみテスト
        if (conference.eventbrite_private_key && conference.ordernumber_for_test) {
            it(`should validate test order for ${conference_name}`, async function() {
                const isValid = await checkEventbriteOrder(
                    conference.ordernumber_for_test,
                    conference
                );
                isValid.should.be.true();
            });
        }
    });

    it('should be invalid for non-existent order number', async function() {
        // テスト用に最初に見つかったEventbriteカンファレンスを使用
        const conference = Object.values(conferences).find(conf => conf.eventbrite_private_key);
        if (!conference) {
            this.skip();
            return;
        }

        const isValid = await checkEventbriteOrder('INVALID123', conference);
        isValid.should.be.false();
    });
});
