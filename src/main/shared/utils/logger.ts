import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { ENV } from '../config/env.config';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
fs.mkdirSync(logDir, { recursive: true });

// ─── Custom Format ────────────────────────────────────────────────────────────

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr =
      Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${ctx}: ${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Logger Instance ──────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: ENV.logLevel,
  transports: [
    // Console — colored, human-readable
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File — JSON, machine-readable
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
});

// ─── Child Loggers ────────────────────────────────────────────────────────────

export const pageLogger = logger.child({ context: 'Page' });
export const stepLogger = logger.child({ context: 'Step' });
export const dataLogger = logger.child({ context: 'Data' });
export const hookLogger = logger.child({ context: 'Hook' });
export const aiLogger  = logger.child({ context: 'API' });

export default logger;
