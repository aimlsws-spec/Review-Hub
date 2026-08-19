import { Controller, Headers, HttpCode, HttpStatus, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';

import { Public } from '@common/decorators';
import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { RazorpayWebhookBody } from '../interfaces';
import { RazorpayService } from '../services';

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
    private readonly razorpayService: RazorpayService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handle(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature?: string) {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing webhook signature');
    }

    const valid = this.razorpayService.verifyWebhookSignature(req.rawBody.toString('utf8'), signature);
    if (!valid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = req.body as RazorpayWebhookBody;
    this.logger.log(`Received Razorpay webhook: ${body.event}`);

    const event = this.razorpayService.parseWebhookEvent(body);
    if (event) {
      this.eventEmitter.emit(event.name, event.payload);
    }

    return { received: true };
  }
}
