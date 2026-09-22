import { Test, TestingModule } from '@nestjs/testing';

import { CampaignStatusChangedEvent } from '../../campaign/events';
import { BadgeEarnedEvent, LevelUpEvent } from '../../gamification/events';
import { MarketplaceRedeemedEvent } from '../../marketplace/events';
import { MerchantRepository } from '../../merchant/repositories';
import { SubmissionRejectedEvent } from '../../task/events';
import { UserKycReviewedEvent } from '../../user-kyc/events';
import { RewardCreditedEvent, RewardReversedEvent, WithdrawalReviewedEvent } from '../../wallet/events';
import { NotificationQueueService } from '../services';

import { NotificationListener } from './notification.listener';

describe('NotificationListener', () => {
  let listener: NotificationListener;

  const mockNotificationQueue = { enqueue: jest.fn() };
  const mockMerchantRepository = { findById: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationQueueService, useValue: mockNotificationQueue },
        { provide: MerchantRepository, useValue: mockMerchantRepository },
      ],
    }).compile();

    listener = module.get<NotificationListener>(NotificationListener);
    jest.clearAllMocks();
  });

  it('should queue a REWARD notification on wallet.reward.credited', async () => {
    await listener.handleRewardCredited(new RewardCreditedEvent('user-1', 'reward-1', 50));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'REWARD', channels: ['IN_APP', 'EMAIL', 'PUSH'] }),
    );
  });

  it('should queue a REWARD notification on wallet.reward.reversed', async () => {
    await listener.handleRewardReversed(new RewardReversedEvent('user-1', 'reward-1', 60, 40));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'REWARD',
        title: 'Reward reversed',
        message: expect.stringContaining('₹60'),
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        data: { rewardId: 'reward-1', reversedAmount: 60, shortfallAmount: 40 },
      }),
    );
  });

  it('should queue a WITHDRAWAL notification on wallet.withdrawal.approved', async () => {
    await listener.handleWithdrawalApproved(new WithdrawalReviewedEvent('wd-1', 'user-1', true));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'WITHDRAWAL', title: 'Withdrawal approved', channels: ['IN_APP', 'EMAIL', 'PUSH'] }),
    );
  });

  it('should queue a WITHDRAWAL notification on wallet.withdrawal.rejected', async () => {
    await listener.handleWithdrawalRejected(new WithdrawalReviewedEvent('wd-1', 'user-1', false));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'WITHDRAWAL', title: 'Withdrawal rejected', channels: ['IN_APP', 'EMAIL', 'PUSH'] }),
    );
  });

  it('should queue a SYSTEM notification on task.submission.rejected', async () => {
    await listener.handleSubmissionRejected(new SubmissionRejectedEvent('sub-1', 'task-1', 'user-1', 'Blurry photo'));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'SYSTEM', message: expect.stringContaining('Blurry photo') }),
    );
  });

  it('should queue a GAMIFICATION notification on gamification.level_up', async () => {
    await listener.handleLevelUp(new LevelUpEvent('user-1', 5));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'GAMIFICATION', message: expect.stringContaining('level 5'), channels: ['IN_APP', 'PUSH'] }),
    );
  });

  it('should queue a GAMIFICATION notification on gamification.badge_earned', async () => {
    await listener.handleBadgeEarned(new BadgeEarnedEvent('user-1', 'badge-1', 'First Reward'));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'GAMIFICATION', message: expect.stringContaining('First Reward'), channels: ['IN_APP', 'PUSH'] }),
    );
  });

  it('should queue a MARKETPLACE notification on marketplace.redeemed', async () => {
    await listener.handleMarketplaceRedeemed(new MarketplaceRedeemedEvent('user-1', 'redemption-1', 'Gift Card', 100));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'MARKETPLACE', channels: ['IN_APP', 'EMAIL'] }),
    );
  });

  describe('merchant wallet top-ups', () => {
    beforeEach(() => mockMerchantRepository.findById.mockResolvedValue({ id: 'merchant-1', userId: 'user-9' }));

    it('tells the owner when money was added by bank transfer, with the reference and the new balance', async () => {
      await listener.handleMerchantToppedUp({ merchantId: 'merchant-1', amount: 25000, bankReference: 'UTR123456789', balanceAfter: 26000 });

      expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-9',
          type: 'SYSTEM',
          title: 'Money added to your wallet',
          message: expect.stringMatching(/₹25000.*UTR123456789.*₹26000/),
          channels: ['IN_APP', 'EMAIL'],
        }),
      );
    });

    it('tells the owner when a top-up was reversed, why, and what is left', async () => {
      await listener.handleMerchantTopUpReversed({ merchantId: 'merchant-1', amount: 5000, reason: 'The amount was typed wrongly', balanceAfter: 1000 });

      expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-9', title: 'A wallet top-up was reversed', message: expect.stringMatching(/₹5000.*typed wrongly.*₹1000/) }),
      );
    });

    it('does nothing, and does not fail, for a merchant that no longer exists', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(listener.handleMerchantToppedUp({ merchantId: 'gone', amount: 1, bankReference: 'UTR000001', balanceAfter: 1 })).resolves.toBeUndefined();
      expect(mockNotificationQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('handleCampaignStatusChanged', () => {
    it('should resolve the merchant and notify on a notifiable status', async () => {
      mockMerchantRepository.findById.mockResolvedValue({ id: 'merchant-1', userId: 'user-9' });

      await listener.handleCampaignStatusChanged(
        new CampaignStatusChangedEvent('campaign-1', 'merchant-1', 'PENDING_REVIEW', 'ACTIVE'),
      );

      expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-9', type: 'CAMPAIGN' }),
      );
    });

    it('should not notify on a non-notifiable status transition', async () => {
      await listener.handleCampaignStatusChanged(
        new CampaignStatusChangedEvent('campaign-1', 'merchant-1', 'DRAFT', 'PENDING_REVIEW'),
      );

      expect(mockMerchantRepository.findById).not.toHaveBeenCalled();
      expect(mockNotificationQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should no-op when the merchant cannot be resolved', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await listener.handleCampaignStatusChanged(
        new CampaignStatusChangedEvent('campaign-1', 'merchant-1', 'PENDING_REVIEW', 'ACTIVE'),
      );

      expect(mockNotificationQueue.enqueue).not.toHaveBeenCalled();
    });
  });
  it('should tell the user their document was verified and that withdrawals are unlocked', async () => {
    await listener.handleKycApproved(new UserKycReviewedEvent('user-1', 'doc-1', 'PAN'));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Identity verified',
        message: expect.stringContaining('PAN'),
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
      }),
    );
  });

  it('should include the rejection reason and ask for a new upload on rejection', async () => {
    await listener.handleKycRejected(new UserKycReviewedEvent('user-1', 'doc-1', 'DRIVING_LICENCE', 'Image is too blurry'));

    const payload = mockNotificationQueue.enqueue.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ userId: 'user-1', type: 'SYSTEM', title: 'Document not accepted' }));
    expect(payload.message).toContain('driving licence');
    expect(payload.message).toContain('Image is too blurry');
    expect(payload.message).toContain('upload it again');
  });
});
