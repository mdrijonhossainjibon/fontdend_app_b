import winston from 'winston';
import { env } from '@/config';

const isDev = env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isDev ? winston.format.colorize() : winston.format.uncolorize(),
    isDev
      ? winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const stackStr = stack ? `\n${stack}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}${stackStr}`;
        })
      : winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    ...(!isDev
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export default logger;
