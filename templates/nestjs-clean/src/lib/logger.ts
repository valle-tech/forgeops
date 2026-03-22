import { getRequestIdFromContext } from './request-context';

export type StructuredLogLevel = 'info' | 'warn' | 'error';

let serviceName = process.env.SERVICE_NAME || '{{SERVICE_NAME}}';

export function configureLogger(opts: { serviceName: string }) {
  serviceName = opts.serviceName;
}

function line(level: StructuredLogLevel, message: string, extra?: Record<string, unknown>) {
  const requestId = getRequestIdFromContext();
  const payload: Record<string, unknown> = {
    level,
    service: serviceName,
    message,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...(extra && Object.keys(extra).length ? extra : {}),
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

export const logger = {
  info(message: string, extra?: Record<string, unknown>) {
    line('info', message, extra);
  },
  warn(message: string, extra?: Record<string, unknown>) {
    line('warn', message, extra);
  },
  error(message: string, extra?: Record<string, unknown>) {
    line('error', message, extra);
  },
};
