import { Controller, Get, BadRequestException } from '@nestjs/common';

/** Example domain module — extend with commands/queries. */
@Controller('payments')
export class PaymentsController {
  @Get()
  list() {
    return { domain: 'payments', items: [] };
  }

  /** Demo validation-style error (for tests / docs). */
  @Get('demo-error')
  demoError() {
    throw new BadRequestException('Invalid input');
  }
}
