import { Test, TestingModule } from '@nestjs/testing';

import { ReferralRepository } from '../repositories';

import { ReferralService } from './referral.service';

describe('ReferralService', () => {
  let service: ReferralService;

  const mockReferralRepository = {
    findByReferrer: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: ReferralRepository, useValue: mockReferralRepository },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    jest.clearAllMocks();
  });

  describe('listMine', () => {
    it('should list referrals scoped to the current user as referrer', async () => {
      mockReferralRepository.findByReferrer.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listMine('user-1', { page: 1, limit: 20 } as never);
      expect(mockReferralRepository.findByReferrer).toHaveBeenCalledWith(
        expect.objectContaining({ referrerId: 'user-1' }),
      );
    });
  });

  describe('getMyStats', () => {
    it('should return referral stats for the user', async () => {
      mockReferralRepository.getStats.mockResolvedValue({ totalReferred: 2, totalRewarded: 1, totalRewardEarned: 50 });

      const result = await service.getMyStats('user-1');
      expect(result).toEqual({ totalReferred: 2, totalRewarded: 1, totalRewardEarned: 50 });
    });
  });
});
