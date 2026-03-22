import { Test } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
    }).compile();
    controller = module.get(PaymentsController);
  });

  it('returns domain payload (unit)', () => {
    expect(controller.list()).toEqual({ domain: 'payments', items: [] });
  });
});
