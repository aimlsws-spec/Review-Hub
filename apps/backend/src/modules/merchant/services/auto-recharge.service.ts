import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError } from '@common/utils';

import { PAYMENT_PROVIDER, PaymentProvider } from '../../payment/interfaces';
import { MERCHANT_EVENTS, MERCHANT_WALLET_CONSTANTS } from '../constants';
import { UpdateAutoRechargeSettingsDto } from '../dto';
import { MerchantAutoRechargePaymentDueEvent, MerchantAutoRechargeTriggeredEvent } from '../events';
import { MerchantRepository, MerchantWalletRepository } from '../repositories';

/**
 * Wallet auto-recharge: a merchant sets a minimum balance and a top-up amount; once
 * availableBalance drops to or below that minimum, AutoRechargeSchedulerService's sweep tops the
 * wallet back up so campaigns don't stall waiting for a manual recharge.
 *
 * What "automatic" means depends on the payment provider (see triggerRecharge below) — this is a
 * deliberate, documented boundary, not a shortcut: silently charging a merchant's card without an
 * on-file consented payment method would be a real compliance problem to fake, not just an
 * engineering one.
 */
@Injectable()
export class AutoRechargeService {
  private readonly logger = new Logger(AutoRechargeService.name);

  constructor(
    private readonly walletRepository: MerchantWalletRepository,
    private readonly merchantRepository: MerchantRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PAYMENT_PROVIDER) private readonly paymentService: PaymentProvider,
  ) {}

  async getSettings(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const wallet = await this.walletRepository.getOrCreate(merchantId);
    return {
      enabled: wallet.autoRechargeEnabled,
      threshold: wallet.autoRechargeThreshold,
      amount: wallet.autoRechargeAmount,
      lastTriggeredAt: wallet.lastAutoRechargeAt,
    };
  }

  async updateSettings(merchantId: string, dto: UpdateAutoRechargeSettingsDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    if (dto.enabled && dto.threshold !== undefined && dto.amount !== undefined && dto.threshold >= dto.amount) {
      throw new BadRequestException(
        'The recharge amount must be greater than the threshold — otherwise the wallet would still qualify to recharge again right after topping up.',
      );
    }

    return this.walletRepository.updateAutoRechargeSettings(merchantId, {
      enabled: dto.enabled,
      threshold: dto.threshold,
      amount: dto.amount,
    });
  }

  /**
   * Runs one sweep over every wallet due for auto-recharge. One wallet's failure is logged and
   * skipped rather than aborting the rest — the next sweep will pick it up again once the cooldown
   * (MERCHANT_WALLET_CONSTANTS.RECHARGE_COOLDOWN_MINUTES) passes.
   */
  async runSweep(): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const due = await this.walletRepository.findWalletsDueForAutoRecharge(MERCHANT_WALLET_CONSTANTS.RECHARGE_COOLDOWN_MINUTES);

    let succeeded = 0;
    let failed = 0;
    for (const wallet of due) {
      try {
        await this.triggerRecharge(wallet);
        succeeded += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(`Auto-recharge failed for merchant wallet ${wallet.id}: ${describeError(error)}`);
      }
    }

    if (due.length > 0) {
      this.logger.log(`Auto-recharge sweep: ${due.length} wallet(s) due, ${succeeded} succeeded, ${failed} failed`);
    }
    return { attempted: due.length, succeeded, failed };
  }

  private async triggerRecharge(wallet: {
    id: string;
    merchantId: string;
    availableBalance: unknown;
    autoRechargeThreshold: unknown;
    autoRechargeAmount: unknown;
  }): Promise<void> {
    const amount = Number(wallet.autoRechargeAmount);
    const threshold = Number(wallet.autoRechargeThreshold);

    // Marked before attempting the charge, not after: the cooldown's job is to stop this exact
    // wallet being picked up again by the *next* sweep while this attempt is still in flight or
    // (for real Razorpay) still awaiting the merchant's action, not to record only clean successes.
    await this.walletRepository.markAutoRechargeAttempted(wallet.id);

    const provider = this.configService.get<string>('payment.provider');

    if (provider !== 'razorpay') {
      // MOCK: completes synchronously, same shape as WalletService.simulateRecharge — lets the
      // whole feature be tested end to end without live Razorpay credentials.
      const mockOrderId = `auto_recharge_mock_${wallet.id}_${Date.now()}`;
      const pending = await this.walletRepository.createPendingTopUp({ merchantWalletId: wallet.id, amount, razorpayOrderId: mockOrderId });
      const confirmed = await this.walletRepository.confirmTopUp(pending.id, `auto_recharge_mock_pay_${Date.now()}`);

      this.eventEmitter.emit(
        MERCHANT_EVENTS.AUTO_RECHARGE_TRIGGERED,
        new MerchantAutoRechargeTriggeredEvent(wallet.merchantId, amount, Number(confirmed.balanceAfter), threshold),
      );
      return;
    }

    // REAL RAZORPAY: there's no saved-payment-method/e-mandate flow in this codebase yet, so there
    // is nothing to silently charge — creating an order still requires the merchant to complete
    // Razorpay Checkout, same as a manual recharge. What "automatic" gets you today is the
    // *detection* and the *order*, not an unattended charge; that needs Razorpay's recurring-
    // payments product, which is a distinct, larger feature (its own consent UI, saved-token
    // storage, webhook handling) — see the module-level comment above.
    const order = await this.paymentService.createOrder(amount, `auto-${wallet.id.slice(0, 8)}-${Date.now()}`);
    await this.walletRepository.createPendingTopUp({ merchantWalletId: wallet.id, amount, razorpayOrderId: order.id });

    this.eventEmitter.emit(
      MERCHANT_EVENTS.AUTO_RECHARGE_PAYMENT_DUE,
      new MerchantAutoRechargePaymentDueEvent(wallet.merchantId, amount, Number(wallet.availableBalance), threshold, order.id),
    );
  }
}
