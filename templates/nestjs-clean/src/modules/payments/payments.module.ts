import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { RootController } from './root.controller';

@Module({
  controllers: [RootController, PaymentsController],
})
export class PaymentsModule {}
