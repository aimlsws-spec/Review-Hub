import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { FeatureFlagRepository } from '../repositories';

import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  const mockFeatureFlagRepository = {
    findAll: jest.fn(),
    findByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: FeatureFlagRepository, useValue: mockFeatureFlagRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should reject a duplicate key', async () => {
      mockFeatureFlagRepository.findByKey.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ key: 'ai_verification' }, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should create and audit a new flag', async () => {
      mockFeatureFlagRepository.findByKey.mockResolvedValue(null);
      mockFeatureFlagRepository.create.mockResolvedValue({ id: 'flag-1', key: 'ai_verification', enabled: false });

      await service.create({ key: 'ai_verification' }, 'admin-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE' }));
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for an unknown key', async () => {
      mockFeatureFlagRepository.findByKey.mockResolvedValue(null);

      await expect(service.update('unknown', { enabled: true }, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should update and audit with a CONFIG_CHANGE action', async () => {
      mockFeatureFlagRepository.findByKey.mockResolvedValue({ id: 'flag-1', enabled: false, rolloutPercentage: 0 });
      mockFeatureFlagRepository.update.mockResolvedValue({ id: 'flag-1', enabled: true, rolloutPercentage: 100 });

      const result = await service.update('ai_verification', { enabled: true, rolloutPercentage: 100 }, 'admin-1');
      expect(result).toHaveProperty('enabled', true);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CONFIG_CHANGE' }));
    });
  });
});
