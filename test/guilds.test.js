'use strict';

const should  = require('should');
const { conferences, guilds } = require('../config.json');

describe('guilds', function(){
    it('should be ScrumFestOsaka has scrumfest-osaka command', function(){
        guilds["ScrumFestOsaka"].conferences.should.deepEqual([]);
    })
    it('should be ScrumFestOsaka has scrumfest-osaka command', function(){
        guilds["ScrumFest2024"].conferences.should.deepEqual(["scrumfest-osaka", "scrumfest-kanazawa", "scrumfest-sendai", "scrumfest-mikawa", "scrumfest-okinawa", "rsgt", "devopsdays"]);
    })
    it('should be ScrumFestSapporo has scrumfest-sapporo command', function(){
        guilds["ScrumFestSapporo"].conferences.should.deepEqual(["scrum-fest-sapporo"]);
    })

})
