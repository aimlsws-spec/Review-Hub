import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DailyRewardPrizeRepository } from '../repositories';

import { DailyRewardPrizeAdminService } from './daily-reward-prize-admin.service';

describe('DailyRewardPrizeAdminService', () => {
  let service: DailyRewardPrizeAdminService;

  const mockPrizeRepository = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyRewardPrizeAdminService,
        { provide: DailyRewardPrizeRepository, useValue: mockPrizeRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<DailyRewardPrizeAdminService>(DailyRewardPrizeAdminService);
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should throw NotFoundException for an unknown prize', async () => {
      mockPrizeRepository.findById.mockResolvedValue(null);
      await expect(service.getById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create the prize and audit it', async () => {
      mockPrizeRepository.create.mockResolvedValue({ id: 'prize-1', label: 'Big', amount: 100, weight: 10 });

      const result = await service.create({ label: 'Big', amount: 100, weight: 10 } as never, 'admin-1');

      expect(result).toHaveProperty('id', 'prize-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin-1', entity: 'DailyRewardPrize', action: 'CREATE' }));
    });
  });

  describe('remove', () => {
    it('should soft delete and audit', async () => {
      mockPrizeRepository.findById.mockResolvedValue({ id: 'prize-1' });
      mockPrizeRepository.softDelete.mockResolvedValue({ id: 'prize-1', deletedAt: new Date() });

      await service.remove('prize-1', 'admin-1');

      expect(mockPrizeRepository.softDelete).toHaveBeenCalledWith('prize-1');
    });
  });
});
