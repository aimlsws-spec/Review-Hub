import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { RewardCreditedEvent } from '../../wallet/events';
import { RewardRepository, UserWalletRepository } from '../../wallet/repositories';
import { REFERRAL_CONSTANTS } from '../constants';
import { ReferralAttributedEvent, ReferralRewardedEvent } from '../events';
import { ReferralRepository } from '../repositories';

@Injectable()
export class ReferralListener {
  private readonly logger = new Logger(ReferralListener.name);

  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Attribution only — no money moves here. The bonus waits for the referred user to actually earn something. */
  @OnEvent('auth.user.registered')
  async handleUserRegistered(payload: { userId: string; referredById?: string; referralCode?: string }) {
    if (!payload.referredById) return;

    const referral = await this.referralRepository.create({
      referrer: { connect: { id: payload.referredById } },
      referredUser: { connect: { id: payload.userId } },
      referralCode: payload.referralCode ?? '',
    });

    this.logger.log(`Referral attributed: ${payload.referredById} referred ${payload.userId}`);
    this.eventEmitter.emit(
      'referral.attributed',
      new ReferralAttributedEvent(referral.id, payload.referredById, payload.userId),
    );
  }

  /** Pays the referrer's bonus the first time — and only the first time — their referral earns a credited reward. */
  @OnEvent('wallet.reward.credited')
  async handleRewardCredited(event: RewardCreditedEvent) {
    const referral = await this.referralRepository.findByReferredUserId(event.userId);
    if (!referral || referral.rewardIssued) return;

    const creditedRewardCount = await this.rewardRepository.countCreditedByUser(event.userId);
    if (creditedRewardCount !== 1) return; // not this user's first credited reward

    const amount = REFERRAL_CONSTANTS.SIGNUP_BONUS_AMOUNT;

    const referralReward = await this.referralRepository.createReward({
      referral: { connect: { id: referral.id } },
      amount,
      status: 'PENDING',
    });

    const referrerWallet = await this.walletRepository.getOrCreate(referral.referrerId);
    const { transaction } = await this.walletRepository.creditAvailable({
      walletId: referrerWallet.id,
      amount,
      type: 'REFERRAL',
      referenceType: 'ReferralReward',
      referenceId: referralReward.id,
      remarks: 'Referral signup bonus',
    });

    await this.referralRepository.markRewardCredited(referralReward.id, transaction.id);
    await this.referralRepository.markRewardIssued(referral.id, amount);

    this.logger.log(`Referral bonus of ₹${amount} credited to ${referral.referrerId}`);
    this.eventEmitter.emit('referral.rewarded', new ReferralRewardedEvent(referral.id, referral.referrerId, amount));
  }
}
