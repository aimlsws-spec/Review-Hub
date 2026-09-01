import { Test, TestingModule } from '@nestjs/testing';

import { CampaignStatusChangedEvent } from '../../campaign/events';
import { BadgeEarnedEvent, LevelUpEvent } from '../../gamification/events';
import { MarketplaceRedeemedEvent } from '../../marketplace/events';
import { MerchantRepository } from '../../merchant/repositories';
import { SubmissionRejectedEvent } from '../../task/events';
import { RewardCreditedEvent, WithdrawalReviewedEvent } from '../../wallet/events';
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
      expect.objectContaining({ userId: 'user-1', type: 'REWARD', channels: ['IN_APP', 'EMAIL'] }),
    );
  });

  it('should queue a WITHDRAWAL notification on wallet.withdrawal.approved', async () => {
    await listener.handleWithdrawalApproved(new WithdrawalReviewedEvent('wd-1', 'user-1', true));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'WITHDRAWAL', title: 'Withdrawal approved' }),
    );
  });

  it('should queue a WITHDRAWAL notification on wallet.withdrawal.rejected', async () => {
    await listener.handleWithdrawalRejected(new WithdrawalReviewedEvent('wd-1', 'user-1', false));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'WITHDRAWAL', title: 'Withdrawal rejected' }),
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
      expect.objectContaining({ userId: 'user-1', type: 'GAMIFICATION', message: expect.stringContaining('level 5') }),
    );
  });

  it('should queue a GAMIFICATION notification on gamification.badge_earned', async () => {
    await listener.handleBadgeEarned(new BadgeEarnedEvent('user-1', 'badge-1', 'First Reward'));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'GAMIFICATION', message: expect.stringContaining('First Reward') }),
    );
  });

  it('should queue a MARKETPLACE notification on marketplace.redeemed', async () => {
    await listener.handleMarketplaceRedeemed(new MarketplaceRedeemedEvent('user-1', 'redemption-1', 'Gift Card', 100));

    expect(mockNotificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'MARKETPLACE', channels: ['IN_APP', 'EMAIL'] }),
    );
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
});
