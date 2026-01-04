import pino, { type LoggerOptions } from 'pino';

import { getConfig } from './config.js';

function createLogger() {
  const config = getConfig();

  const redactPaths = ['sessionToken', 'token', 'code', 'authorization'];

  const options: LoggerOptions = {
    level: config.logLevel,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}

export const logger = createLogger();

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
