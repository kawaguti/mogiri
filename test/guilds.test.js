'use strict';

const should  = require('should');
const { conferences, guilds } = require('../config.json');

describe('guildss', function(){
    it('should be ScrumFestSapporo has scrum-fest-sapporo command', function(){
        guilds["ScrumFestSapporo"].conferences.should.deepEqual(["scrum-fest-sapporo"]);
    })

    it('should be ScrumFestOsaka has rsgt2023 command', function(){
        guilds["ScrumFestOsaka"].conferences.should.deepEqual(["rsgt2023"]);
    })    

})