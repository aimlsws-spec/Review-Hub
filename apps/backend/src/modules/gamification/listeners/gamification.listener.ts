import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ReferralRewardedEvent } from '../../referral/events';
import { RewardCreditedEvent } from '../../wallet/events';
import { GamificationService } from '../services';

/** Advances XP/level/streak and evaluates badges every time a reward is durably credited. Mirrors ReferralListener, the other consumer of this same event. */
@Injectable()
export class GamificationListener {
  constructor(private readonly gamificationService: GamificationService) {}

  @OnEvent('wallet.reward.credited')
  async handleRewardCredited(event: RewardCreditedEvent) {
    await this.gamificationService.recordActivity(event.userId, event.amount);
  }

  /** A paid referral can complete a referral badge for the person who referred. */
  @OnEvent('referral.rewarded')
  async handleReferralRewarded(event: ReferralRewardedEvent) {
    await this.gamificationService.checkBadges(event.referrerId);
  }
}
