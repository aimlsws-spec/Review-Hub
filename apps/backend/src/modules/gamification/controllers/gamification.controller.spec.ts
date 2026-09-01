import { Test, TestingModule } from '@nestjs/testing';

import { DailyRewardService, GamificationService } from '../services';

import { GamificationController } from './gamification.controller';

describe('GamificationController', () => {
  let controller: GamificationController;

  const mockGamificationService = { getProfile: jest.fn(), getBadges: jest.fn() };
  const mockDailyRewardService = { claim: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        { provide: GamificationService, useValue: mockGamificationService },
        { provide: DailyRewardService, useValue: mockDailyRewardService },
      ],
    }).compile();

    controller = module.get<GamificationController>(GamificationController);
    jest.clearAllMocks();
  });

  it('getProfile should delegate to the service', async () => {
    await controller.getProfile('user-1');
    expect(mockGamificationService.getProfile).toHaveBeenCalledWith('user-1');
  });

  it('getBadges should delegate to the service', async () => {
    await controller.getBadges('user-1');
    expect(mockGamificationService.getBadges).toHaveBeenCalledWith('user-1');
  });

  it('claimDailyReward should delegate to the daily reward service', async () => {
    await controller.claimDailyReward('user-1');
    expect(mockDailyRewardService.claim).toHaveBeenCalledWith('user-1');
  });
});
