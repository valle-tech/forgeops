import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JsonLoggerService implements LoggerService {
  private readonly service: string;

  constructor(private readonly config: ConfigService) {
    this.service = this.config.get<string>('serviceName', '{{SERVICE_NAME}}');
  }

  private line(level: LogLevel, message: unknown, context?: string, extra?: Record<string, unknown>) {
    const base: Record<string, unknown> = {
      level,
      service: this.service,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: new Date().toISOString(),
    };
    if (context) base.context = context;
    if (extra && Object.keys(extra).length) Object.assign(base, extra);
    process.stdout.write(JSON.stringify(base) + '\n');
  }

  log(message: unknown, context?: string) {
    this.line('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.line('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string) {
    this.line('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.line('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.line('verbose', message, context);
  }

  /** Structured log with arbitrary fields (e.g. requestId). */
  infoStructured(message: string, fields: Record<string, unknown>) {
    this.line('info', message, undefined, fields);
  }
}
