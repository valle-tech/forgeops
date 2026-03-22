import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      service: '{{SERVICE_NAME}}',
      message: 'Forgeops-generated NestJS service',
    };
  }
}
