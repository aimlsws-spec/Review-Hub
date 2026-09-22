import { Controller, Headers, HttpCode, HttpStatus, Inject, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';

import { Public } from '@common/decorators';
import { BadRequestException } from '@common/exceptions/domain.exceptions';


import { PAYMENT_PROVIDER, PaymentProvider, RazorpayWebhookBody } from '../interfaces';

/**
 * Razorpay calls this directly — no JWT, verified purely by HMAC signature
 * against the raw request body (main.ts enables rawBody capture for this).
 * Handlers only verify + emit; MerchantModule and WalletModule react to the
 * resulting events so this module never has to import either of them.
 */
@Controller({ path: 'payments/webhooks/razorpay', version: '1' })
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentService: PaymentProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('X-Razorpay-Signature') signature: string,
  ) {
    if (!signature || !req.rawBody) throw new BadRequestException('Missing webhook signature');

    // The bytes exactly as they arrived: the signature was made over those, not over a re-written copy of them.
    const isValid = this.paymentService.verifyWebhookSignature(req.rawBody, signature);
    if (!isValid) {
      this.logger.warn('Rejected webhook with invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = this.paymentService.parseWebhookEvent(req.body as RazorpayWebhookBody);
    if (event) {
      this.eventEmitter.emit(event.name, event.payload);
      this.logger.log(`Emitted internal event ${event.name} from webhook`);
    }

    return { received: true };
  }
}
