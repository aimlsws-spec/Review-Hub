import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CampaignStatus } from '@prisma/client';

import { CampaignStatusChangedEvent } from '../../campaign/events';
import { BadgeEarnedEvent, LevelUpEvent } from '../../gamification/events';
import { MarketplaceRedeemedEvent } from '../../marketplace/events';
import {
  MerchantAutoRechargePaymentDueEvent,
  MerchantAutoRechargeTriggeredEvent,
  MerchantToppedUpEvent,
  MerchantTopUpReversedEvent,
} from '../../merchant/events';
import { MerchantRepository } from '../../merchant/repositories';
import { DisputeResolvedEvent, SubmissionRejectedEvent } from '../../task/events';
import { UserKycReviewedEvent } from '../../user-kyc/events';
import { RewardCreditedEvent, RewardReversedEvent, WithdrawalFailedEvent, WithdrawalPaidEvent, WithdrawalReviewedEvent } from '../../wallet/events';
import { NotificationQueueService } from '../services';

/** Reads naturally in a sentence: PAN -> "PAN", DRIVING_LICENCE -> "driving licence". */
const describeDocument = (documentType: string) => (documentType === 'PAN' ? 'PAN' : documentType.replace(/_/g, ' ').toLowerCase());

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
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { rewardId: event.rewardId, amount: event.amount },
    });
  }

  @OnEvent('wallet.reward.reversed')
  async handleRewardReversed(event: RewardReversedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'REWARD',
      title: 'Reward reversed',
      message: `₹${event.reversedAmount} was reversed from your wallet following a review of your task submission.`,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { rewardId: event.rewardId, reversedAmount: event.reversedAmount, shortfallAmount: event.shortfallAmount },
    });
  }

  @OnEvent('user.kyc.approved')
  async handleKycApproved(event: UserKycReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'SYSTEM',
      title: 'Identity verified',
      message: `Your ${describeDocument(event.documentType)} has been verified. You can now request withdrawals.`,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { documentId: event.documentId, documentType: event.documentType },
    });
  }

  @OnEvent('user.kyc.rejected')
  async handleKycRejected(event: UserKycReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'SYSTEM',
      title: 'Document not accepted',
      message: `Your ${describeDocument(event.documentType)} was not accepted: ${event.reason}. Please upload it again.`,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { documentId: event.documentId, documentType: event.documentType, reason: event.reason },
    });
  }

  @OnEvent('wallet.withdrawal.approved')
  async handleWithdrawalApproved(event: WithdrawalReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal approved',
      message: 'Your withdrawal request has been approved. The money is on its way to your bank account.',
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { withdrawalId: event.withdrawalId },
    });
  }

  @OnEvent('merchant.wallet.topped_up')
  async handleMerchantToppedUp(event: MerchantToppedUpEvent) {
    await this.notifyMerchantOwner(event.merchantId, {
      title: 'Money added to your wallet',
      message: `₹${event.amount} was added to your wallet after your bank transfer (reference ${event.bankReference}). Your balance is now ₹${event.balanceAfter}.`,
      data: { amount: event.amount, bankReference: event.bankReference },
    });
  }

  @OnEvent('merchant.wallet.top_up_reversed')
  async handleMerchantTopUpReversed(event: MerchantTopUpReversedEvent) {
    await this.notifyMerchantOwner(event.merchantId, {
      title: 'A wallet top-up was reversed',
      message: `₹${event.amount} was taken back out of your wallet: ${event.reason}. Your balance is now ₹${event.balanceAfter}. If you think this is a mistake, contact support.`,
      data: { amount: event.amount, reason: event.reason },
    });
  }

  @OnEvent('merchant.wallet.auto_recharge_triggered')
  async handleAutoRechargeTriggered(event: MerchantAutoRechargeTriggeredEvent) {
    await this.notifyMerchantOwner(event.merchantId, {
      title: 'Wallet auto-recharged',
      message: `Your balance dropped to ₹${event.thresholdCrossed} or below, so we added ₹${event.amount} automatically. Your balance is now ₹${event.balanceAfter}.`,
      data: { amount: event.amount, balanceAfter: event.balanceAfter },
    });
  }

  @OnEvent('merchant.wallet.auto_recharge_payment_due')
  async handleAutoRechargePaymentDue(event: MerchantAutoRechargePaymentDueEvent) {
    await this.notifyMerchantOwner(event.merchantId, {
      title: 'Complete your wallet auto-recharge',
      message: `Your balance dropped to ₹${event.availableBalance}, at or below your ₹${event.thresholdCrossed} threshold. We've started a ₹${event.amount} top-up — complete the payment to keep your campaigns running.`,
      data: { amount: event.amount, razorpayOrderId: event.razorpayOrderId },
    });
  }

  @OnEvent('wallet.withdrawal.paid')
  async handleWithdrawalPaid(event: WithdrawalPaidEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Money sent',
      message: `₹${event.amount} has been sent to your bank account${event.reference ? ` (reference ${event.reference})` : ''}.`,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { withdrawalId: event.withdrawalId, reference: event.reference },
    });
  }

  @OnEvent('wallet.withdrawal.failed')
  async handleWithdrawalFailed(event: WithdrawalFailedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal could not be sent',
      message: `We could not send ₹${event.amount} to your bank account (${event.reason}). The money is back in your wallet.`,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      data: { withdrawalId: event.withdrawalId, reason: event.reason },
    });
  }

  @OnEvent('wallet.withdrawal.rejected')
  async handleWithdrawalRejected(event: WithdrawalReviewedEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal rejected',
      message: 'Your withdrawal request could not be processed.',
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
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

  @OnEvent('task.dispute.resolved')
  async handleDisputeResolved(event: DisputeResolvedEvent) {
    const upheld = event.decision === 'UPHELD';
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'SYSTEM',
      title: upheld ? 'Dispute reviewed' : 'Dispute resolved in your favour',
      message: upheld
        ? 'An admin reviewed your dispute and upheld the original decision.'
        : 'An admin reviewed your dispute and reversed the rejection — your reward has been credited.',
      channels: ['IN_APP', 'EMAIL'],
      data: { disputeId: event.disputeId, submissionId: event.submissionId, decision: event.decision },
    });
  }

  @OnEvent('gamification.level_up')
  async handleLevelUp(event: LevelUpEvent) {
    await this.notificationQueue.enqueue({
      userId: event.userId,
      type: 'GAMIFICATION',
      title: 'Level up!',
      message: `You've reached level ${event.newLevel}.`,
      channels: ['IN_APP', 'PUSH'],
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
      channels: ['IN_APP', 'PUSH'],
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

  /** Tells the person who owns a merchant account about something that happened to its wallet. */
  private async notifyMerchantOwner(merchantId: string, notice: { title: string; message: string; data: Record<string, unknown> }) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      this.logger.warn(`Wallet change for unknown merchant ${merchantId}`);
      return;
    }
    await this.notificationQueue.enqueue({
      userId: merchant.userId,
      type: 'SYSTEM',
      title: notice.title,
      message: notice.message,
      channels: ['IN_APP', 'EMAIL'],
      data: notice.data,
    });
  }
}
