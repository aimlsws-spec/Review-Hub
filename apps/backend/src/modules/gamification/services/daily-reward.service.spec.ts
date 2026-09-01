import { randomInt } from 'crypto';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { UserWalletRepository } from '../../wallet/repositories';
import { GAMIFICATION_EVENTS } from '../constants';
import { DailyRewardClaimRepository, DailyRewardPrizeRepository } from '../repositories';

import { DailyRewardService } from './daily-reward.service';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

describe('DailyRewardService', () => {
  let service: DailyRewardService;

  const mockClaimRepository = { findForUserToday: jest.fn(), create: jest.fn() };
  const mockPrizeRepository = { findAllActive: jest.fn() };
  const mockWalletRepository = { getOrCreate: jest.fn(), creditAvailable: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyRewardService,
        { provide: DailyRewardClaimRepository, useValue: mockClaimRepository },
        { provide: DailyRewardPrizeRepository, useValue: mockPrizeRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DailyRewardService>(DailyRewardService);
    jest.clearAllMocks();
  });

  describe('claim', () => {
    it('should reject a second claim on the same day', async () => {
      mockClaimRepository.findForUserToday.mockResolvedValue({ id: 'claim-1' });

      await expect(service.claim('user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrizeRepository.findAllActive).not.toHaveBeenCalled();
    });

    it('should reject when no prizes are configured', async () => {
      mockClaimRepository.findForUserToday.mockResolvedValue(null);
      mockPrizeRepository.findAllActive.mockResolvedValue([]);

      await expect(service.claim('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should draw a prize by weight, credit the wallet with type BONUS, and record the claim', async () => {
      mockClaimRepository.findForUserToday.mockResolvedValue(null);
      mockPrizeRepository.findAllActive.mockResolvedValue([
        { id: 'prize-1', label: 'Small', amount: 5, weight: 90 },
        { id: 'prize-2', label: 'Big', amount: 100, weight: 10 },
      ]);
      (randomInt as jest.Mock).mockReturnValue(95); // lands past the first prize's 90-wide slice
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockClaimRepository.create.mockResolvedValue({ id: 'claim-1' });

      const result = await service.claim('user-1');

      expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith({
        walletId: 'wallet-1',
        amount: 100,
        type: 'BONUS',
        referenceType: 'DailyRewardPrize',
        referenceId: 'prize-2',
        remarks: 'Daily reward: Big',
      });
      expect(mockClaimRepository.create).toHaveBeenCalledWith({ userId: 'user-1', prizeId: 'prize-2', rewardAmount: 100 });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(GAMIFICATION_EVENTS.DAILY_REWARD_CLAIMED, expect.objectContaining({ amount: 100 }));
      expect(result.prize).toEqual({ id: 'prize-2', label: 'Big', amount: 100 });
    });

    it('should draw the low-weight prize when the roll lands in its slice', async () => {
      mockClaimRepository.findForUserToday.mockResolvedValue(null);
      mockPrizeRepository.findAllActive.mockResolvedValue([
        { id: 'prize-1', label: 'Small', amount: 5, weight: 90 },
        { id: 'prize-2', label: 'Big', amount: 100, weight: 10 },
      ]);
      (randomInt as jest.Mock).mockReturnValue(10);
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockClaimRepository.create.mockResolvedValue({ id: 'claim-1' });

      const result = await service.claim('user-1');

      expect(result.prize.id).toBe('prize-1');
    });
  });
});
