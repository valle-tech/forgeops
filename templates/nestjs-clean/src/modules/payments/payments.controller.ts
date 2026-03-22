import { Controller, Get, BadRequestException } from '@nestjs/common';
import { logger } from '../../lib/logger';

/** Example domain module — extend with commands/queries. */
@Controller('payments')
export class PaymentsController {
  @Get()
  list() {
    logger.info('important action', { action: 'list_payments', domain: 'payments' });
    return { domain: 'payments', items: [] };
  }

  /** Demo validation-style error (for tests / docs). */
  @Get('demo-error')
  demoError() {
    throw new BadRequestException('Invalid input');
  }
}
