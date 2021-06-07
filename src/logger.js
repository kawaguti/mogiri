const log4js = require("log4js");

log4js.configure({
  appenders: {
    console: { type: 'console' },
  },
  categories: {
    default:    { appenders: ['console'], level: 'debug' },
    test:       { appenders: ['console'], level: 'warn' },
    develop:    { appenders: ['console'], level: 'debug' },
    production: { appenders: ['console'], level: 'warn' }
  }
});
const logger = log4js.getLogger(process.env.NODE_ENV);

module.exports = {
  logger
}
