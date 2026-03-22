import { Controller, Get, Header } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: '{{SERVICE_NAME}}' };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  metrics() {
    return [
      '# HELP http_requests_total Total HTTP requests',
      '# TYPE http_requests_total counter',
      'http_requests_total{service="{{SERVICE_SLUG}}"} 0',
      '# HELP http_errors_total Total HTTP errors',
      '# TYPE http_errors_total counter',
      'http_errors_total{service="{{SERVICE_SLUG}}"} 0',
      '',
    ].join('\n');
  }
}
