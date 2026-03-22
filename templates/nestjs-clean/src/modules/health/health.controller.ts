import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  liveness() {
    return {
      status: 'ok',
      service: this.config.get<string>('serviceName'),
    };
  }

  @Get('ready')
  async readiness() {
    return this.health.checkReadiness();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  metrics(@Res() res: Response) {
    const slug = '{{SERVICE_SLUG}}';
    const body = [
      '# HELP http_requests_total Total HTTP requests',
      '# TYPE http_requests_total counter',
      `http_requests_total{service="${slug}"} 0`,
      '# HELP http_errors_total Total HTTP errors',
      '# TYPE http_errors_total counter',
      `http_errors_total{service="${slug}"} 0`,
      '',
    ].join('\n');
    res.send(body);
  }
}
