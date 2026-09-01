import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { MerchantWalletRepository } from '../../modules/merchant/repositories';
import { RewardRepository, UserWalletRepository } from '../../modules/wallet/repositories';

import { RewardProcessor } from './reward.processor';

describe('RewardProcessor', () => {
  let processor: RewardProcessor;

  const mockRewardRepository = {
    findBySubmissionId: jest.fn(),
    create: jest.fn(),
    markCredited: jest.fn(),
  };
  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    creditAvailable: jest.fn(),
  };
  const mockMerchantWalletRepository = {
    spendCampaignBudget: jest.fn(),
  };
  const mockEventEmitter = { emit: jest.fn() };

  const jobData = { submissionId: 'submission-1', taskId: 'task-1', campaignId: 'campaign-1', userId: 'user-1', rewardAmount: 50 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardProcessor,
        { provide: RewardRepository, useValue: mockRewardRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: MerchantWalletRepository, useValue: mockMerchantWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    processor = module.get<RewardProcessor>(RewardProcessor);
    jest.clearAllMocks();
  });

  it('should create a Reward, credit the wallet, mark it credited, and emit wallet.reward.credited', async () => {
    mockRewardRepository.findBySubmissionId.mockResolvedValue(null);
    mockRewardRepository.create.mockResolvedValue({ id: 'reward-1' });
    mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });

    await processor.process({ data: jobData } as never);

    expect(mockRewardRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, status: 'APPROVED' }),
    );
    expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: 'wallet-1', amount: 50, referenceId: 'reward-1' }),
    );
    expect(mockRewardRepository.markCredited).toHaveBeenCalledWith('reward-1');
    expect(mockMerchantWalletRepository.spendCampaignBudget).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      amount: 50,
      rewardId: 'reward-1',
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'wallet.reward.credited',
      expect.objectContaining({ userId: 'user-1', amount: 50 }),
    );
  });

  it('should skip work if a reward already exists for this submission (idempotency)', async () => {
    mockRewardRepository.findBySubmissionId.mockResolvedValue({ id: 'existing-reward' });

    await processor.process({ data: jobData } as never);

    expect(mockRewardRepository.create).not.toHaveBeenCalled();
    expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
    expect(mockMerchantWalletRepository.spendCampaignBudget).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
