import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { AccountLinkageService } from '../../risk/services';
import { RewardCreditedEvent } from '../../wallet/events';
import { RewardRepository, UserWalletRepository } from '../../wallet/repositories';
import { ReferralRepository } from '../repositories';

import { ReferralListener } from './referral.listener';

describe('ReferralListener', () => {
  let listener: ReferralListener;

  const mockReferralRepository = {
    create: jest.fn(),
    findByReferredUserId: jest.fn(),
    createReward: jest.fn(),
    markRewardCredited: jest.fn(),
    markRewardIssued: jest.fn(),
  };
  const mockRewardRepository = { countCreditedByUser: jest.fn() };
  const mockWalletRepository = { getOrCreate: jest.fn(), creditAvailable: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAccountLinkage = { areLinked: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralListener,
        { provide: ReferralRepository, useValue: mockReferralRepository },
        { provide: RewardRepository, useValue: mockRewardRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AccountLinkageService, useValue: mockAccountLinkage },
      ],
    }).compile();

    listener = module.get<ReferralListener>(ReferralListener);
    jest.clearAllMocks();
    mockAccountLinkage.areLinked.mockResolvedValue(false);
  });

  describe('handleUserRegistered', () => {
    it('should create a Referral row when a referrer is present', async () => {
      mockReferralRepository.create.mockResolvedValue({ id: 'referral-1' });

      await listener.handleUserRegistered({ userId: 'user-2', referredById: 'user-1', referralCode: 'abc123' });

      expect(mockReferralRepository.create).toHaveBeenCalledWith({
        referrer: { connect: { id: 'user-1' } },
        referredUser: { connect: { id: 'user-2' } },
        referralCode: 'abc123',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('referral.attributed', expect.any(Object));
    });

    it('should do nothing for an organic signup with no referrer', async () => {
      await listener.handleUserRegistered({ userId: 'user-2' });
      expect(mockReferralRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('handleRewardCredited', () => {
    const event = new RewardCreditedEvent('user-2', 'reward-1', 50);

    it('should pay the referrer a bonus on the referred user\'s first credited reward', async () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue({ id: 'referral-1', referrerId: 'user-1', rewardIssued: false });
      mockRewardRepository.countCreditedByUser.mockResolvedValue(1);
      mockReferralRepository.createReward.mockResolvedValue({ id: 'referral-reward-1' });
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-referrer' });
      mockWalletRepository.creditAvailable.mockResolvedValue({ transaction: { id: 'txn-1' } });

      await listener.handleRewardCredited(event);

      expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith(expect.objectContaining({
        walletId: 'wallet-referrer', amount: 50, type: 'REFERRAL',
      }));
      expect(mockReferralRepository.markRewardIssued).toHaveBeenCalledWith('referral-1', 50);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('referral.rewarded', expect.any(Object));
    });

    it('should not pay a bonus for a second reward', async () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue({ id: 'referral-1', referrerId: 'user-1', rewardIssued: false });
      mockRewardRepository.countCreditedByUser.mockResolvedValue(2);

      await listener.handleRewardCredited(event);

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
    });

    it('should not pay a bonus twice for the same referral', async () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue({ id: 'referral-1', referrerId: 'user-1', rewardIssued: true });

      await listener.handleRewardCredited(event);

      expect(mockRewardRepository.countCreditedByUser).not.toHaveBeenCalled();
      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
    });

    it('should do nothing if this user was never referred', async () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue(null);

      await listener.handleRewardCredited(event);

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
    });
  });
  describe('self-referral protection', () => {
    const event = new RewardCreditedEvent('user-2', 'reward-1', 50);
    const arrange = () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue({ id: 'referral-1', referrerId: 'user-1', rewardIssued: false });
      mockRewardRepository.countCreditedByUser.mockResolvedValue(1);
      mockReferralRepository.createReward.mockResolvedValue({ id: 'referral-reward-1' });
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-referrer' });
      mockWalletRepository.creditAvailable.mockResolvedValue({ transaction: { id: 'txn-1' } });
    };

    it('pays no bonus when the referrer and the referred user are tied by a PAN, bank account or device', async () => {
      arrange();
      mockAccountLinkage.areLinked.mockResolvedValue(true);

      await listener.handleRewardCredited(event);

      expect(mockAccountLinkage.areLinked).toHaveBeenCalledWith('user-1', 'user-2');
      expect(mockReferralRepository.createReward).not.toHaveBeenCalled();
      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
      expect(mockReferralRepository.markRewardIssued).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('referral.rewarded', expect.anything());
    });

    it('pays the bonus as usual for two unrelated people', async () => {
      arrange();

      await listener.handleRewardCredited(event);

      expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet-referrer', type: 'REFERRAL' }));
    });

    it('pays the bonus when the check itself fails: the bonus is small and an honest referrer should not lose it to an outage', async () => {
      arrange();
      mockAccountLinkage.areLinked.mockRejectedValue(new Error('database unavailable'));

      await listener.handleRewardCredited(event);

      expect(mockWalletRepository.creditAvailable).toHaveBeenCalled();
    });

    it('does not run the check for a user who was not referred, or on a later reward', async () => {
      mockReferralRepository.findByReferredUserId.mockResolvedValue(null);
      await listener.handleRewardCredited(event);

      mockReferralRepository.findByReferredUserId.mockResolvedValue({ id: 'referral-1', referrerId: 'user-1', rewardIssued: false });
      mockRewardRepository.countCreditedByUser.mockResolvedValue(2);
      await listener.handleRewardCredited(event);

      expect(mockAccountLinkage.areLinked).not.toHaveBeenCalled();
    });
  });
});
