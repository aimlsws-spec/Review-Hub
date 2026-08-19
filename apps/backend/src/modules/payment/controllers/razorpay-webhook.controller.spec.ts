import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PAYMENT_EVENTS } from '../constants';
import { RazorpayService } from '../services';

import { RazorpayWebhookController } from './razorpay-webhook.controller';

describe('RazorpayWebhookController', () => {
  let controller: RazorpayWebhookController;

  const mockRazorpayService = {
    verifyWebhookSignature: jest.fn(),
    parseWebhookEvent: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const buildRequest = (body: unknown, rawBody: Buffer | undefined = Buffer.from(JSON.stringify(body))) => ({
    body,
    rawBody,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RazorpayWebhookController],
      providers: [
        { provide: RazorpayService, useValue: mockRazorpayService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    controller = module.get<RazorpayWebhookController>(RazorpayWebhookController);
    jest.clearAllMocks();
  });

  it('should throw BadRequestException when the signature header is missing', async () => {
    const req = buildRequest({ event: 'payment.captured', payload: {} });

    await expect(controller.handle(req as never, undefined)).rejects.toThrow(BadRequestException);
    expect(mockRazorpayService.verifyWebhookSignature).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when the raw body is missing', async () => {
    const req = buildRequest({ event: 'payment.captured', payload: {} }, undefined);

    await expect(controller.handle(req as never, 'sig_1')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when the signature is invalid', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(false);
    const req = buildRequest({ event: 'payment.captured', payload: {} });

    await expect(controller.handle(req as never, 'sig_1')).rejects.toThrow(BadRequestException);
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should emit whatever event the service resolves from the payload', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
    mockRazorpayService.parseWebhookEvent.mockReturnValue({
      name: PAYMENT_EVENTS.PAYMENT_CAPTURED,
      payload: { orderId: 'order_1', paymentId: 'pay_1' },
    });
    const req = buildRequest({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
    });

    const result = await controller.handle(req as never, 'sig_1');

    expect(mockRazorpayService.parseWebhookEvent).toHaveBeenCalledWith(req.body);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(PAYMENT_EVENTS.PAYMENT_CAPTURED, {
      orderId: 'order_1',
      paymentId: 'pay_1',
    });
    expect(result).toEqual({ received: true });
  });

  it('should not emit when the service reports no resolvable event', async () => {
    mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
    mockRazorpayService.parseWebhookEvent.mockReturnValue(null);
    const req = buildRequest({ event: 'order.paid', payload: {} });

    const result = await controller.handle(req as never, 'sig_1');

    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });
});
