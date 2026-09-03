import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { MerchantWalletRepository } from '../../merchant/repositories';
import { RewardRepository, UserWalletRepository } from '../../wallet/repositories';
import { FraudFlagRepository } from '../repositories';

import { FraudReviewService } from './fraud-review.service';

describe('FraudReviewService', () => {
  let service: FraudReviewService;

  const mockFraudFlagRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    resolve: jest.fn(),
  };
  const mockDeviceRepository = {
    findHighRisk: jest.fn(),
  };
  const mockRewardRepository = {
    findBySubmissionId: jest.fn(),
    markReversed: jest.fn(),
  };
  const mockUserWalletRepository = {
    getOrCreate: jest.fn(),
    clawbackReward: jest.fn(),
  };
  const mockMerchantWalletRepository = {
    restoreClawedBackBudget: jest.fn(),
  };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudReviewService,
        { provide: FraudFlagRepository, useValue: mockFraudFlagRepository },
        { provide: DeviceRepository, useValue: mockDeviceRepository },
        { provide: RewardRepository, useValue: mockRewardRepository },
        { provide: UserWalletRepository, useValue: mockUserWalletRepository },
        { provide: MerchantWalletRepository, useValue: mockMerchantWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<FraudReviewService>(FraudReviewService);
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    it('should mark an unresolved flag resolved and audit it', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue({ id: 'flag-1', resolved: false });
      mockFraudFlagRepository.resolve.mockResolvedValue({ id: 'flag-1', resolved: true });

      const result = await service.resolve('flag-1', 'admin-1');

      expect(result).toHaveProperty('resolved', true);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', entity: 'SubmissionFraudFlag', action: 'UPDATE' }),
      );
    });

    it('should throw NotFoundException for an unknown flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(null);

      await expect(service.resolve('unknown', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject resolving an already-resolved flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue({ id: 'flag-1', resolved: true });

      await expect(service.resolve('flag-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listHighRiskDevices', () => {
    it('should delegate to the device repository with the query params', async () => {
      mockDeviceRepository.findHighRisk.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listHighRiskDevices({ minRiskScore: 40, page: 1, limit: 20 } as never);

      expect(mockDeviceRepository.findHighRisk).toHaveBeenCalledWith({ minRiskScore: 40, page: 1, limit: 20 });
    });
  });

  describe('reverseReward', () => {
    const flag = { id: 'flag-1', submissionId: 'sub-1', resolved: false };
    const reward = { id: 'reward-1', userId: 'user-1', campaignId: 'campaign-1', amount: 100, status: 'CREDITED' };

    it('throws NotFoundException for an unknown flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(null);

      await expect(service.reverseReward('unknown', 'admin-1', { reason: 'Confirmed fraud' })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the submission has no reward', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(flag);
      mockRewardRepository.findBySubmissionId.mockResolvedValue(null);

      await expect(service.reverseReward('flag-1', 'admin-1', { reason: 'Confirmed fraud' })).rejects.toThrow(NotFoundException);
    });

    it('rejects reversing a reward that is not CREDITED', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(flag);
      mockRewardRepository.findBySubmissionId.mockResolvedValue({ ...reward, status: 'REVERSED' });

      await expect(service.reverseReward('flag-1', 'admin-1', { reason: 'Confirmed fraud' })).rejects.toThrow(BadRequestException);
    });

    it('claws back what is available, restores the merchant in full, and resolves the flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(flag);
      mockRewardRepository.findBySubmissionId.mockResolvedValue(reward);
      mockUserWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockUserWalletRepository.clawbackReward.mockResolvedValue({ recoverable: 60, shortfall: 40 });
      mockRewardRepository.markReversed.mockResolvedValue({ ...reward, status: 'REVERSED', reversedAmount: 60, shortfallAmount: 40 });

      const result = await service.reverseReward('flag-1', 'admin-1', { reason: 'Confirmed fraud' });

      expect(mockUserWalletRepository.clawbackReward).toHaveBeenCalledWith({
        walletId: 'wallet-1', amount: 100, referenceId: 'reward-1', remarks: expect.stringContaining('Confirmed fraud'),
      });
      expect(mockMerchantWalletRepository.restoreClawedBackBudget).toHaveBeenCalledWith({
        campaignId: 'campaign-1', amount: 100, rewardId: 'reward-1',
      });
      expect(mockRewardRepository.markReversed).toHaveBeenCalledWith('reward-1', {
        reversedAmount: 60, shortfallAmount: 40, reversalReason: 'Confirmed fraud', reversedBy: 'admin-1',
      });
      expect(mockFraudFlagRepository.resolve).toHaveBeenCalledWith('flag-1', 'admin-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('wallet.reward.reversed', expect.any(Object));
      expect(result).toHaveProperty('status', 'REVERSED');
    });

    it('does not re-resolve a flag that is already resolved', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue({ ...flag, resolved: true });
      mockRewardRepository.findBySubmissionId.mockResolvedValue(reward);
      mockUserWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockUserWalletRepository.clawbackReward.mockResolvedValue({ recoverable: 100, shortfall: 0 });
      mockRewardRepository.markReversed.mockResolvedValue({ ...reward, status: 'REVERSED' });

      await service.reverseReward('flag-1', 'admin-1', { reason: 'Confirmed fraud' });

      expect(mockFraudFlagRepository.resolve).not.toHaveBeenCalled();
    });
  });
});
