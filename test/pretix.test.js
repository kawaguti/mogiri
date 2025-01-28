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
                const isValid = await checkPretixOrder(
                    conference.ordernumber_for_test,
                    conference
                );
                isValid.should.be.true();
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

        const isValid = await checkPretixOrder('INVALID123', conference);
        isValid.should.be.false();
    });
});
