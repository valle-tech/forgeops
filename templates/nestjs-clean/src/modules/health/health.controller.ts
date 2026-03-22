import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';
import { metricsRegister } from '../../lib/metrics';

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
  async metrics(@Res() res: Response) {
    res.setHeader('Content-Type', metricsRegister.contentType);
    res.send(await metricsRegister.metrics());
  }
}
