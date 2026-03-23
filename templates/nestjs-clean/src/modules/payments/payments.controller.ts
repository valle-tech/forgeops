{{PAYMENTS_AUTH_IMPORTS}}
import { Controller, Get, BadRequestException{{PAYMENTS_USE_GUARDS}} } from '@nestjs/common';
import { logger } from '../../lib/logger';

@Controller('payments')
export class PaymentsController {
  @Get()
  list() {
    logger.info('important action', { action: 'list_payments', domain: 'payments' });
    return { domain: 'payments', items: [] };
  }

  @Get('demo-error')
  demoError() {
    throw new BadRequestException('Invalid input');
  }
{{PAYMENTS_AUTH_EXTRA}}
}
