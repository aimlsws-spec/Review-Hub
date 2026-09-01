import { randomBytes } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { UserWalletRepository } from '../../wallet/repositories';
import { MARKETPLACE_EVENTS } from '../constants';
import { MarketplaceRedeemedEvent } from '../events';
import { MarketplaceItemRepository, RedemptionRepository } from '../repositories';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly itemRepository: MarketplaceItemRepository,
    private readonly redemptionRepository: RedemptionRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listItems(page: number, limit: number, category?: string) {
    return this.itemRepository.findAll({ page, limit, category, isActive: true });
  }

  async listMyRedemptions(userId: string, page: number, limit: number) {
    return this.redemptionRepository.findByUser(userId, page, limit);
  }

  /**
   * Stock is reserved before money moves (cheap, reversible-by-construction —
   * nothing to undo if it fails). The wallet debit happens second; if it
   * fails (insufficient balance), the just-reserved stock unit is given back.
   * Mirrors WithdrawalService.request()'s compensate-on-partial-failure shape.
   */
  async redeem(userId: string, itemId: string) {
    const item = await this.itemRepository.findById(itemId);
    if (!item || !item.isActive) throw new NotFoundException('Marketplace item');

    const stockReserved = await this.itemRepository.decrementStockIfTracked(itemId);
    const costAmount = Number(item.costAmount);

    try {
      const wallet = await this.walletRepository.getOrCreate(userId);
      await this.walletRepository.debitForRedemption({
        walletId: wallet.id,
        amount: costAmount,
        referenceType: 'MarketplaceItem',
        referenceId: itemId,
        remarks: `Redeemed: ${item.title}`,
      });
    } catch (error) {
      if (stockReserved) await this.itemRepository.incrementStock(itemId);
      throw error;
    }

    const redemptionCode = randomBytes(6).toString('hex').toUpperCase();
    const redemption = await this.redemptionRepository.create({ userId, itemId, costAmount, redemptionCode });

    this.logger.log(`User ${userId} redeemed "${item.title}" for ₹${costAmount} (code ${redemptionCode})`);
    this.eventEmitter.emit(MARKETPLACE_EVENTS.REDEEMED, new MarketplaceRedeemedEvent(userId, redemption.id, item.title, costAmount));

    return redemption;
  }
}
