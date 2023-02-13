'use strict';

const should  = require('should');
const { conferences, guilds } = require('../config.json');

describe('guildss', function(){
    it('should be ScrumFestOsaka has scrum-fest-fukuoka command', function(){
        guilds["ScrumFestOsaka"].conferences.should.deepEqual(["scrum-fest-fukuoka"]);
    })

})
