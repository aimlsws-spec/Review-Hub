import { Injectable } from '@nestjs/common';

import { RewardQueryDto, WalletTransactionQueryDto } from '../dto';
import { RewardRepository, UserWalletRepository } from '../repositories';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: UserWalletRepository,
    private readonly rewardRepository: RewardRepository,
  ) {}

  /** A wallet is created lazily on first access rather than at signup, so every user has one without a migration backfill. */
  async getWallet(userId: string) {
    return this.walletRepository.getOrCreate(userId);
  }

  async getTransactions(userId: string, query: WalletTransactionQueryDto) {
    const wallet = await this.walletRepository.getOrCreate(userId);
    return this.walletRepository.findTransactions(wallet.id, query.page, query.limit, query.type);
  }

  async getMyRewards(userId: string, query: RewardQueryDto) {
    return this.rewardRepository.findByUser({
      userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  /** Rewards paid out to users across all of this merchant's campaigns. */
  async getMerchantRewards(merchantId: string, page: number, limit: number) {
    return this.rewardRepository.findByMerchant({ merchantId, page, limit });
  }
}
