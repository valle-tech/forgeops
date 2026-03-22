import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureLogger, logger } from '../../lib/logger';

@Injectable()
export class JsonLoggerService implements LoggerService {
  constructor(private readonly config: ConfigService) {
    configureLogger({ serviceName: this.config.get<string>('serviceName', '{{SERVICE_NAME}}') });
  }

  log(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    logger.info(msg, context ? { context } : undefined);
  }

  error(message: unknown, trace?: string, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const extra: Record<string, unknown> = {};
    if (trace) extra.trace = trace;
    if (context) extra.context = context;
    logger.error(msg, Object.keys(extra).length ? extra : undefined);
  }

  warn(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    logger.warn(msg, context ? { context } : undefined);
  }

  debug(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    logger.info(msg, context ? { context, nestLevel: 'debug' } : { nestLevel: 'debug' });
  }

  verbose(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    logger.info(msg, context ? { context, nestLevel: 'verbose' } : { nestLevel: 'verbose' });
  }

  /** Structured log with arbitrary fields (e.g. action). */
  infoStructured(message: string, fields: Record<string, unknown>) {
    logger.info(message, fields);
  }
}
