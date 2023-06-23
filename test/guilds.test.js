'use strict';

const should  = require('should');
const { conferences, guilds } = require('../config.json');

describe('guildss', function(){
    it('should be ScrumFestOsaka has scrumfest-osaka command', function(){
        guilds["ScrumFestOsaka"].conferences.should.deepEqual(["scrumfest-osaka", "scrumfest-mikawa"]);
    })

})
