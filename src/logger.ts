import * as winston from 'winston'

const alignColorsAndTime = winston.format.combine(
  winston.format.colorize({
    all: true,
  }),
  winston.format.label({
    label: '[LOGGER]',
  }),
  winston.format.timestamp({
    format: 'YY-MM-DD HH:MM:SS',
  }),
  winston.format.printf(info => `${info.label} ${info.timestamp} ${info.level}: ${info.message}`),
)

export default winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  transports: [
    new winston.transports.Console({
      format: alignColorsAndTime,
    }),
  ],
})
