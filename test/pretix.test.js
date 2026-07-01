'use strict';

const should = require('should');
const { conferences } = require('../config.json');
const checkPretixOrder = require('../src/pretix.js');

describe('pretix', function() {
    // config.jsonに定義されているすべてのカンファレンスをテスト
    Object.entries(conferences).forEach(([conference_name, conference]) => {
        // Pretixのカンファレンスのみテスト
        if (conference.pretix_private_key && conference.ordernumber_for_test) {
            it(`should validate test order for ${conference_name}`, async function() {
                const result = await checkPretixOrder(
                    conference.ordernumber_for_test,
                    conference
                );
                result.should.be.an.Object();
                result.isValid.should.be.true();
                result.ticketCount.should.be.a.Number();
                result.ticketCount.should.be.aboveOrEqual(1);
                should(result.reason).be.null();
            });
        }
    });

    it('should be invalid for non-existent order number', async function() {
        // テスト用に最初に見つかったPretixカンファレンスを使用
        const conference = Object.values(conferences).find(conf => conf.pretix_private_key);
        if (!conference) {
            this.skip();
            return;
        }

        const result = await checkPretixOrder('INVALID123', conference);
        result.should.be.an.Object();
        result.isValid.should.be.false();
        result.ticketCount.should.equal(0);
        result.reason.should.equal('api_error');
    });
});
