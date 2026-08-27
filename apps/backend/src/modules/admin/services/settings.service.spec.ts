import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { SystemSettingRepository } from '../repositories';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockSettingRepository = {
    findAll: jest.fn(),
    findByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SystemSettingRepository, useValue: mockSettingRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should reject a duplicate key', async () => {
      mockSettingRepository.findByKey.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ key: 'x', value: 1 }, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should create and audit a new setting', async () => {
      mockSettingRepository.findByKey.mockResolvedValue(null);
      mockSettingRepository.create.mockResolvedValue({ id: 'setting-1', key: 'withdrawal.min_amount' });

      await service.create({ key: 'withdrawal.min_amount', value: 1000 }, 'admin-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE' }));
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for an unknown key', async () => {
      mockSettingRepository.findByKey.mockResolvedValue(null);

      await expect(service.update('unknown', { value: 1 }, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject updating a non-editable setting', async () => {
      mockSettingRepository.findByKey.mockResolvedValue({ id: 'setting-1', editable: false });

      await expect(service.update('locked.setting', { value: 1 }, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should update and audit an editable setting with a CONFIG_CHANGE action', async () => {
      mockSettingRepository.findByKey.mockResolvedValue({ id: 'setting-1', editable: true, value: 500 });
      mockSettingRepository.update.mockResolvedValue({ id: 'setting-1', value: 1000 });

      const result = await service.update('withdrawal.min_amount', { value: 1000 }, 'admin-1');
      expect(result).toHaveProperty('value', 1000);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CONFIG_CHANGE' }));
    });
  });
});
