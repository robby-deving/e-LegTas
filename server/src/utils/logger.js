const fs = require('fs');
const path = require('path');
const { createLogger, format, transports, addColors } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom levels include "audit" between info and warn
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    audit: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
    silly: 7
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    audit: 'magenta',
    info: 'green',
    http: 'cyan',
    verbose: 'blue',
    debug: 'white',
    silly: 'grey'
  }
};

addColors(customLevels.colors);

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const baseFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

const uppercaseLevel = format((info) => {
  if (info && typeof info.level === 'string') {
    info.level = info.level.toUpperCase();
  }
  return info;
});

const consoleFormat = isProduction
  ? format.combine(uppercaseLevel(), format.json())
  : format.combine(
      uppercaseLevel(),
      format.colorize({ level: true }),
      format.printf(({ timestamp, level, message, metadata }) => {
        const meta = metadata && Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
        return `${timestamp} [ ${level} ] ${message}${meta}`;
      })
    );

const fileJsonFormat = format.combine(format.json());

// Date pattern dd-MM-yyyy
const datePattern = 'DD-MM-YYYY';

const errorFileTransport = new DailyRotateFile({
  level: 'error',
  dirname: path.join(logsDir, 'errors'),
  filename: `%DATE%-error.log`,
  datePattern,
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileJsonFormat
});

const auditFileTransport = new DailyRotateFile({
  level: 'audit',
  dirname: path.join(logsDir, 'audit'),
  filename: `%DATE%-audit.log`,
  datePattern,
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileJsonFormat
});

const infoFileTransport = new DailyRotateFile({
  level: 'info',
  dirname: path.join(logsDir, 'info'),
  filename: `%DATE%-info.log`,
  datePattern,
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileJsonFormat
});

const combinedFileTransport = new DailyRotateFile({
  level: 'info',
  dirname: logsDir,
  filename: `%DATE%-combined.log`,
  datePattern,
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileJsonFormat
});

const logger = createLogger({
  levels: customLevels.levels,
  level: isDevelopment ? 'silly' : 'http',
  format: baseFormat,
  transports: [
    new transports.Console({ format: consoleFormat }),
    errorFileTransport,
    auditFileTransport,
    infoFileTransport,
    combinedFileTransport
  ],
  exitOnError: false
});

// Helper stream for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;


