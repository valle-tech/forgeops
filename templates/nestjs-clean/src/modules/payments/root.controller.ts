import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class RootController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  root() {
    return {
      service: this.config.get<string>('serviceName'),
      message: 'Forgeops-generated NestJS service',
      modules: ['health', 'payments'],
    };
  }
}
