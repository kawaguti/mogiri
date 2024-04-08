'use strict';

const should  = require('should');
const { conferences, guilds } = require('../config.json');

describe('guilds', function(){
    it('should be ScrumFestOsaka has scrumfest-osaka command', function(){
        guilds["ScrumFestOsaka"].conferences.should.deepEqual(["devopsdays-tokyo","scrumfest-fukuoka","scrumfest-niigata"]);
    })
    it('should be ScrumFestOsaka has scrumfest-osaka command', function(){
        guilds["ScrumFest2024"].conferences.should.deepEqual(["scrumfest-osaka"]);
    })
    it('should be ScrumFestSapporo has scrumfest-sapporo command', function(){
        guilds["ScrumFestSapporo"].conferences.should.deepEqual(["scrum-fest-sapporo"]);
    })

})
