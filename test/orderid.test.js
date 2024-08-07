'use strict';

const should  = require('should');
const orderid = require('../src/orderid.js');

describe('ordernumber', function(){
   it('should be false if ordernumber is 1235456', function(){
      orderid('123456').should.equal(false);
   });
   it('should be 1234567890 if ordernumber is 1234567890', function(){
      orderid('1234567890').should.equal("1234567890");
   });
   it('should be 1234567890 if ordernumber is #1234567890', function(){
      orderid('#1234567890').should.equal("1234567890");
   });
   it('should be false if ordernumber is #123456789', function(){
      orderid('#123456789').should.equal(false);
   });
   it('should be false if ordernumber is #12345678901', function(){
      orderid('#12345678901').should.equal("12345678901");
   });
   it('should be false if ordernumber is 12345678901', function(){
      orderid('12345678901').should.equal("12345678901");
   });
   it('should be false if ordernumber is #123456789012', function(){
      orderid('#123456789012').should.equal(false);
   });
   it('should be false if ordernumber is 123456789012', function(){
      orderid('123456789012').should.equal(false);
   });

});
