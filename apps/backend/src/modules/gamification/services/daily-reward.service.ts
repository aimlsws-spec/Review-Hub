import { randomInt } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyRewardPrize } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { UserWalletRepository } from '../../wallet/repositories';
import { GAMIFICATION_EVENTS } from '../constants';
import { DailyRewardClaimedEvent } from '../events';
import { DailyRewardClaimRepository, DailyRewardPrizeRepository } from '../repositories';

@Injectable()
export class DailyRewardService {
  private readonly logger = new Logger(DailyRewardService.name);

  constructor(
    private readonly claimRepository: DailyRewardClaimRepository,
    private readonly prizeRepository: DailyRewardPrizeRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async claim(userId: string) {
    const existing = await this.claimRepository.findForUserToday(userId);
    if (existing) throw new BadRequestException('Already claimed today — come back tomorrow');

    const prizes = await this.prizeRepository.findAllActive();
    if (prizes.length === 0) throw new BadRequestException('No daily reward is available right now');

    const prize = this.drawWeightedRandom(prizes);
    const amount = Number(prize.amount);

    const wallet = await this.walletRepository.getOrCreate(userId);
    await this.walletRepository.creditAvailable({
      walletId: wallet.id,
      amount,
      type: 'BONUS',
      referenceType: 'DailyRewardPrize',
      referenceId: prize.id,
      remarks: `Daily reward: ${prize.label}`,
    });

    const claim = await this.claimRepository.create({ userId, prizeId: prize.id, rewardAmount: amount });

    this.logger.log(`User ${userId} claimed daily reward "${prize.label}" (₹${amount})`);
    this.eventEmitter.emit(GAMIFICATION_EVENTS.DAILY_REWARD_CLAIMED, new DailyRewardClaimedEvent(userId, prize.label, amount));

    return { claim, prize: { id: prize.id, label: prize.label, amount } };
  }

  private drawWeightedRandom(prizes: DailyRewardPrize[]): DailyRewardPrize {
    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    let roll = randomInt(totalWeight);

    for (const prize of prizes) {
      if (roll < prize.weight) return prize;
      roll -= prize.weight;
    }

    return prizes[prizes.length - 1];
  }
}
