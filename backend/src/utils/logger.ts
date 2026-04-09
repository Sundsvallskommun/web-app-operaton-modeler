import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors, splat } = format;

const lineFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level} ${stack || message}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), errors({ stack: true }), splat(), lineFormat),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp(), errors({ stack: true }), splat(), lineFormat),
    }),
  ],
});

export const stream = {
  write: (message: string) => logger.info(message.trim()),
};
