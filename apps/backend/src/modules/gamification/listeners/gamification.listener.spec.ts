import { Test, TestingModule } from '@nestjs/testing';

import { GamificationService } from '../services';

import { GamificationListener } from './gamification.listener';

describe('GamificationListener', () => {
  let listener: GamificationListener;

  const mockGamificationService = { recordActivity: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamificationListener, { provide: GamificationService, useValue: mockGamificationService }],
    }).compile();

    listener = module.get<GamificationListener>(GamificationListener);
    jest.clearAllMocks();
  });

  it('should record activity for the credited user and amount', async () => {
    await listener.handleRewardCredited({ userId: 'user-1', rewardId: 'reward-1', amount: 50 } as never);

    expect(mockGamificationService.recordActivity).toHaveBeenCalledWith('user-1', 50);
  });
});
