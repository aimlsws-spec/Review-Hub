import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

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
    jest.resetAllMocks();
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

  describe('a job that is repeated or resumed', () => {
    const credited = { id: 'reward-1', status: 'CREDITED' };
    const half = { id: 'reward-1', status: 'APPROVED' };

    beforeEach(() => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
    });

    it('pays a reward that was created but never credited, instead of skipping it', async () => {
      // The first attempt created the reward row and then failed. The retry must finish the job.
      mockRewardRepository.findBySubmissionId.mockResolvedValue(half);

      await processor.process({ data: jobData } as never);

      expect(mockRewardRepository.create).not.toHaveBeenCalled();
      expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ walletId: 'wallet-1', amount: 50, referenceId: 'reward-1', idempotent: true }),
      );
      expect(mockRewardRepository.markCredited).toHaveBeenCalledWith('reward-1');
      expect(mockMerchantWalletRepository.spendCampaignBudget).toHaveBeenCalledWith({ campaignId: 'campaign-1', amount: 50, rewardId: 'reward-1' });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.reward.credited', expect.objectContaining({ userId: 'user-1' }));
    });

    it('asks the wallet to credit only once per reward, so a retry after a crash can not pay twice', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(half);

      await processor.process({ data: jobData } as never);

      expect(mockWalletRepository.creditAvailable.mock.calls[0][0].idempotent).toBe(true);
    });

    it('still charges the campaign budget for a reward that was credited but whose budget charge failed', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(credited);

      await processor.process({ data: jobData } as never);

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
      expect(mockRewardRepository.markCredited).not.toHaveBeenCalled();
      expect(mockMerchantWalletRepository.spendCampaignBudget).toHaveBeenCalledWith({ campaignId: 'campaign-1', amount: 50, rewardId: 'reward-1' });
    });

    it('does not tell the user about a reward they were already told about', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(credited);

      await processor.process({ data: jobData } as never);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does nothing new for a job that has fully finished before (the charge itself is a no-op the second time)', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(credited);

      await processor.process({ data: jobData } as never);
      await processor.process({ data: jobData } as never);

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
      expect(mockRewardRepository.create).not.toHaveBeenCalled();
    });

    it.each(['REVERSED', 'CANCELLED', 'FAILED', 'EXPIRED'])('never pays a reward that is %s', async (status) => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue({ id: 'reward-1', status });

      await processor.process({ data: jobData } as never);

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
      expect(mockMerchantWalletRepository.spendCampaignBudget).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('lets the job fail, so it is retried, when crediting throws; nothing later runs', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(null);
      mockRewardRepository.create.mockResolvedValue({ id: 'reward-1', status: 'APPROVED' });
      mockWalletRepository.creditAvailable.mockRejectedValue(new Error('Lock wait timeout exceeded'));

      await expect(processor.process({ data: jobData } as never)).rejects.toThrow('Lock wait timeout');

      expect(mockRewardRepository.markCredited).not.toHaveBeenCalled();
      expect(mockMerchantWalletRepository.spendCampaignBudget).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('a retry after that failure finishes the job', async () => {
      // Attempt 1: reward created, credit fails.
      mockRewardRepository.findBySubmissionId.mockResolvedValueOnce(null);
      mockRewardRepository.create.mockResolvedValue({ id: 'reward-1', status: 'APPROVED' });
      mockWalletRepository.creditAvailable.mockRejectedValueOnce(new Error('deadlock'));
      await expect(processor.process({ data: jobData } as never)).rejects.toThrow('deadlock');

      // Attempt 2: the reward row is there, still not credited.
      mockRewardRepository.findBySubmissionId.mockResolvedValueOnce({ id: 'reward-1', status: 'APPROVED' });
      mockWalletRepository.creditAvailable.mockResolvedValueOnce({ alreadyApplied: false });
      await processor.process({ data: jobData } as never);

      expect(mockRewardRepository.markCredited).toHaveBeenCalledWith('reward-1');
      expect(mockMerchantWalletRepository.spendCampaignBudget).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('two jobs for one submission at the same moment', () => {
    const duplicate = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

    beforeEach(() => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
    });

    it('uses the reward the other job created instead of failing', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'reward-winner', status: 'APPROVED' });
      mockRewardRepository.create.mockRejectedValue(duplicate());

      await processor.process({ data: jobData } as never);

      expect(mockWalletRepository.creditAvailable).toHaveBeenCalledWith(expect.objectContaining({ referenceId: 'reward-winner' }));
    });

    it('still fails for any other database error while creating the reward', async () => {
      mockRewardRepository.findBySubmissionId.mockResolvedValue(null);
      mockRewardRepository.create.mockRejectedValue(new Error('connection lost'));

      await expect(processor.process({ data: jobData } as never)).rejects.toThrow('connection lost');

      expect(mockWalletRepository.creditAvailable).not.toHaveBeenCalled();
    });
  });
});
