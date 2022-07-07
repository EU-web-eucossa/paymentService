const winston = require('winston');

const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.json(),
  defaultMeta: {service: 'EucossaPaymentService'},
  transports: [
    new winston.transports.File({filename: 'error.log', level:'error'}),
    new winston.transports.File({filename: 'comnbined.log'}),
  ]
});

module.exports = logger;
