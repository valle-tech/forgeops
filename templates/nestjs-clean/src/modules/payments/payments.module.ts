import { Module } from '@nestjs/common';
{{PAYMENTS_NEST_IMPORTS}}
import { PaymentsController } from './payments.controller';
import { RootController } from './root.controller';

@Module({
{{PAYMENTS_IMPORTS_BLOCK}}  controllers: [RootController, PaymentsController],
})
export class PaymentsModule {}
