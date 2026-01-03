import type { Env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private readonly minLevel: number;
  private readonly context: LogContext;

  constructor(level: LogLevel = 'info', context: LogContext = {}) {
    this.minLevel = LOG_LEVELS[level];
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): string {
    const mergedContext = { ...this.context, ...context };
    const hasContext = Object.keys(mergedContext).length > 0;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (hasContext) {
      entry.context = mergedContext;
    }

    return JSON.stringify(entry);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatEntry('error', message, context));
    }
  }

  child(context: LogContext): Logger {
    return new Logger(
      (Object.entries(LOG_LEVELS).find(([, v]) => v === this.minLevel)?.[0] as LogLevel) ?? 'info',
      { ...this.context, ...context }
    );
  }
}

export function anonymizeUserId(userId: string): string {
  if (userId.length <= 8) {
    return `${userId.substring(0, 2)}***`;
  }
  return `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
}

export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***@***';
  }
  const anonymizedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
  return `${anonymizedLocal}@${domain}`;
}

export function hashForLogging(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

let defaultLogger: Logger | null = null;

export function createLogger(env: Pick<Env, 'LOG_LEVEL'>): Logger {
  defaultLogger = new Logger(env.LOG_LEVEL);
  return defaultLogger;
}

export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger('info');
  }
  return defaultLogger;
}
