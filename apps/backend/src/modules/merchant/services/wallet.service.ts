import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { RazorpayService } from '../../payment/services';
import { VerifyRechargeDto } from '../dto';
import { MerchantRepository, MerchantWalletRepository } from '../repositories';

@Injectable()
export class WalletService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly walletRepository: MerchantWalletRepository,
    private readonly razorpayService: RazorpayService,
  ) {}

  async getWallet(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    const wallet = await this.walletRepository.findByMerchantId(merchantId);
    if (!wallet) throw new NotFoundException('Wallet');
    return wallet;
  }

  async getTransactions(merchantId: string, page = 1, limit = 20) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const wallet = await this.walletRepository.findByMerchantId(merchantId);
    if (!wallet) throw new NotFoundException('Wallet');

    return this.walletRepository.findTransactions(wallet.id, page, limit);
  }

  /** Creates a Razorpay order for a wallet top-up. Nothing is credited until the payment is confirmed. */
  async createRechargeOrder(merchantId: string, amount: number) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const wallet = await this.walletRepository.getOrCreate(merchantId);
    const order = await this.razorpayService.createOrder(amount, `recharge-${wallet.id}-${Date.now()}`);
    await this.walletRepository.createPendingTopUp({ merchantWalletId: wallet.id, amount, razorpayOrderId: order.id });

    return { razorpayOrderId: order.id, amount, currency: order.currency };
  }

  /** Confirms a top-up right after Razorpay Checkout succeeds client-side (the webhook is the durable backup for this same confirmation). */
  async verifyRecharge(merchantId: string, dto: VerifyRechargeDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const valid = this.razorpayService.verifyPaymentSignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!valid) throw new BadRequestException('Payment signature verification failed');

    const pending = await this.walletRepository.findPendingTopUpByOrderId(dto.razorpayOrderId);
    if (!pending) throw new NotFoundException('Pending recharge for this order');

    return this.walletRepository.confirmTopUp(pending.id, dto.razorpayPaymentId);
  }
}
