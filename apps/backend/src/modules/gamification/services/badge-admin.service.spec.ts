import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { BadgeRepository } from '../repositories';

import { BadgeAdminService } from './badge-admin.service';

describe('BadgeAdminService', () => {
  let service: BadgeAdminService;

  const mockBadgeRepository = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgeAdminService,
        { provide: BadgeRepository, useValue: mockBadgeRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<BadgeAdminService>(BadgeAdminService);
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should throw NotFoundException for an unknown badge', async () => {
      mockBadgeRepository.findById.mockResolvedValue(null);
      await expect(service.getById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create the badge and audit it', async () => {
      mockBadgeRepository.create.mockResolvedValue({ id: 'badge-1', code: 'FIRST', name: 'First' });

      const result = await service.create({ code: 'FIRST', name: 'First', description: 'x', criteriaType: 'XP_THRESHOLD', criteriaValue: 10 } as never, 'admin-1');

      expect(result).toHaveProperty('id', 'badge-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin-1', entity: 'Badge', action: 'CREATE' }));
    });
  });

  describe('remove', () => {
    it('should soft delete and audit', async () => {
      mockBadgeRepository.findById.mockResolvedValue({ id: 'badge-1' });
      mockBadgeRepository.softDelete.mockResolvedValue({ id: 'badge-1', deletedAt: new Date() });

      await service.remove('badge-1', 'admin-1');

      expect(mockBadgeRepository.softDelete).toHaveBeenCalledWith('badge-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });
  });
});
