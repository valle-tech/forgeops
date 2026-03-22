import { Registry, Counter, Histogram } from 'prom-client';

export const metricsRegister = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  registers: [metricsRegister],
});

export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total failed HTTP requests (status >= 400)',
  registers: [metricsRegister],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [metricsRegister],
});

export function recordHttpRequest(durationMs: number, statusCode: number) {
  httpRequestsTotal.inc();
  httpRequestDurationMs.observe(durationMs);
  if (statusCode >= 400) {
    httpErrorsTotal.inc();
  }
}
