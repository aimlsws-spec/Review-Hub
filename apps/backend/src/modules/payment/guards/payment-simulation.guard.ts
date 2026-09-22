import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

/**
 * Protects the "simulate payment" endpoints, which credit a wallet without any
 * real money changing hands. They exist so the flow can be tested with no
 * Razorpay credentials, so they only respond while the mock gateway is active.
 * Any other configuration answers 404, as if the route did not exist.
 */
@Injectable()
export class PaymentSimulationGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get<string>('payment.provider') !== 'mock') {
      throw new NotFoundException('Endpoint');
    }
    return true;
  }
}
