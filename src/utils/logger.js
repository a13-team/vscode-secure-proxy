import winston from 'winston';
import { config } from '../config.js';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.resolve(config.logging.directory);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  config.logging.format === 'json'
    ? winston.format.json()
    : winston.format.simple()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for persistent logging
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// Log unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

export const createRequestLogger = (requestId) => {
  return {
    info: (message, meta = {}) => {
      logger.info(message, { requestId, ...meta });
    },
    error: (message, meta = {}) => {
      logger.error(message, { requestId, ...meta });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { requestId, ...meta });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { requestId, ...meta });
    }
  };
};