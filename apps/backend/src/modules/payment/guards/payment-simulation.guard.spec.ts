import { ConfigService } from '@nestjs/config';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { PaymentSimulationGuard } from './payment-simulation.guard';

describe('PaymentSimulationGuard', () => {
  const guardFor = (provider: string | undefined) =>
    new PaymentSimulationGuard({ get: jest.fn().mockReturnValue(provider) } as unknown as ConfigService);

  it('lets the request through while the mock gateway is active', () => {
    expect(guardFor('mock').canActivate()).toBe(true);
  });

  it('answers as if the route does not exist when Razorpay is active', () => {
    expect(() => guardFor('razorpay').canActivate()).toThrow(NotFoundException);
  });

  it('fails closed when the provider is not configured at all', () => {
    expect(() => guardFor(undefined).canActivate()).toThrow(NotFoundException);
  });
});
