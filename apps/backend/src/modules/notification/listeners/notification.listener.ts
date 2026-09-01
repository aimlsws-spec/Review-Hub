import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CampaignStatus } from '@prisma/client';

import { CampaignStatusChangedEvent } from '../../campaign/events';
import { BadgeEarnedEvent, LevelUpEvent } from '../../gamification/events';
import { MarketplaceRedeemedEvent } from '../../marketplace/events';
import { MerchantRepository } from '../../merchant/repositories';
import { SubmissionRejectedEvent } from '../../task/events';
import { RewardCreditedEvent, WithdrawalReviewedEvent } from '../../wallet/events';
import { NotificationQueueService } from '../services';

const MERCHANT_NOTIFIABLE_STATUSES: CampaignStatus[] = ['APPROVED', 'ACTIVE', 'REJECTED', 'CHANGES_REQUESTED'];

/**
 * Turns domain events from other modules into queued notifications. Only
 * enqueues — actual delivery happens in NotificationProcessor so every
 * dispatch gets BullMQ retry semantics instead of running inline on the
 * event-emitter's synchronous call stack.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationQueue: NotificationQueueService,
    private readonly merchantRepository: MerchantRepository,
  ) {}

  @OnEvent('wallet.reward.credited')
  async handleRewardCredited(event: RewardCreditedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'REWARD',
      title: 'Reward credited',
      message: `₹${event.amount} has been credited to your wallet.`,
      channels: ['IN_APP', 'EMAIL'],
      data: { rewardId: event.rewardId, amount: event.amount },
    });
  }

  @OnEvent('wallet.withdrawal.approved')
  async handleWithdrawalApproved(event: WithdrawalReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal approved',
      message: 'Your withdrawal request has been approved and processed.',
      channels: ['IN_APP', 'EMAIL'],
      data: { withdrawalId: event.withdrawalId },
    });
  }

  @OnEvent('wallet.withdrawal.rejected')
  async handleWithdrawalRejected(event: WithdrawalReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal rejected',
      message: 'Your withdrawal request could not be processed.',
      channels: ['IN_APP', 'EMAIL'],
      data: { withdrawalId: event.withdrawalId },
    });
  }

  @OnEvent('task.submission.rejected')
  async handleSubmissionRejected(event: SubmissionRejectedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'SYSTEM',
      title: 'Submission rejected',
      message: `Your task submission was rejected. Reason: ${event.reason}`,
      channels: ['IN_APP', 'EMAIL'],
      data: { submissionId: event.submissionId, taskId: event.taskId },
    });
  }

  @OnEvent('gamification.level_up')
  async handleLevelUp(event: LevelUpEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'GAMIFICATION',
      title: 'Level up!',
      message: `You've reached level ${event.newLevel}.`,
      channels: ['IN_APP'],
      data: { newLevel: event.newLevel },
    });
  }

  @OnEvent('gamification.badge_earned')
  async handleBadgeEarned(event: BadgeEarnedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'GAMIFICATION',
      title: 'Badge earned!',
      message: `You've earned the "${event.badgeName}" badge.`,
      channels: ['IN_APP'],
      data: { badgeId: event.badgeId },
    });
  }

  @OnEvent('marketplace.redeemed')
  async handleMarketplaceRedeemed(event: MarketplaceRedeemedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'MARKETPLACE',
      title: 'Redemption confirmed',
      message: `You redeemed "${event.itemTitle}" for ₹${event.costAmount}.`,
      channels: ['IN_APP', 'EMAIL'],
      data: { redemptionId: event.redemptionId },
    });
  }

  @OnEvent('campaign.status_changed')
  async handleCampaignStatusChanged(event: CampaignStatusChangedEvent) {
    if (!MERCHANT_NOTIFIABLE_STATUSES.includes(event.toStatus)) return;

    const merchant = await this.merchantRepository.findById(event.merchantId);
    if (!merchant) {
      this.logger.warn(`Campaign status changed for unknown merchant ${event.merchantId}`);
      return;
    }

    await this.notificationQueue.enqueue({
      userId: merchant.userId,
      type: 'CAMPAIGN',
      title: `Campaign ${event.toStatus.toLowerCase().replace('_', ' ')}`,
      message: `Your campaign status changed to ${event.toStatus.replace('_', ' ')}.`,
      channels: ['IN_APP', 'EMAIL'],
      data: { campaignId: event.campaignId, status: event.toStatus },
    });
  }
}
