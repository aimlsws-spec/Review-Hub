import { Test, TestingModule } from '@nestjs/testing';

import { ReferralService } from '../services';

import { ReferralController } from './referral.controller';

describe('ReferralController', () => {
  let controller: ReferralController;

  const mockReferralService = {
    listMine: jest.fn(),
    getMyStats: jest.fn(),
    getLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [{ provide: ReferralService, useValue: mockReferralService }],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listMine', () => {
    it('should call referralService.listMine', async () => {
      const query = { page: 1, limit: 20 };
      await controller.listMine('user-1', query as never);
      expect(mockReferralService.listMine).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('getMyStats', () => {
    it('should call referralService.getMyStats', async () => {
      await controller.getMyStats('user-1');
      expect(mockReferralService.getMyStats).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getLeaderboard', () => {
    it('should call referralService.getLeaderboard with a numeric limit, defaulting to 20', async () => {
      await controller.getLeaderboard();
      expect(mockReferralService.getLeaderboard).toHaveBeenCalledWith(20);
    });

    it('should coerce a string query param to a number', async () => {
      await controller.getLeaderboard('5');
      expect(mockReferralService.getLeaderboard).toHaveBeenCalledWith(5);
    });
  });
});
