/**
 * Winston logger utility
 * Provides structured logging with proper log levels
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const winstonLogger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'eonmeds-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Create a wrapper to maintain backward compatibility
export const logger = {
  info: (message: string, meta?: any) => {
    winstonLogger.info(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    winstonLogger.warn(message, meta);
  },
  
  error: (message: string, error?: any) => {
    if (error instanceof Error) {
      winstonLogger.error(message, { error: error.message, stack: error.stack });
    } else {
      winstonLogger.error(message, error);
    }
  },
  
  debug: (message: string, meta?: any) => {
    winstonLogger.debug(message, meta);
  }
};

export default logger;
