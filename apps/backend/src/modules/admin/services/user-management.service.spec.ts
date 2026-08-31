import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserAdminRepository } from '../repositories';

import { UserManagementService } from './user-management.service';

describe('UserManagementService', () => {
  let service: UserManagementService;

  const mockUserAdminRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  const user = { id: 'user-1', status: 'ACTIVE' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        { provide: UserAdminRepository, useValue: mockUserAdminRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should throw NotFoundException for an unknown user', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(null);

      await expect(service.getById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspend', () => {
    it('should set status SUSPENDED and audit the change with SUSPEND action', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(user);
      mockUserAdminRepository.updateStatus.mockResolvedValue({ ...user, status: 'SUSPENDED' });

      const result = await service.suspend('user-1', 'admin-1', { reason: 'Policy violation' });

      expect(result).toHaveProperty('status', 'SUSPENDED');
      expect(mockUserAdminRepository.updateStatus).toHaveBeenCalledWith('user-1', 'SUSPENDED');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'SUSPEND', entity: 'User' }),
      );
    });
  });

  describe('ban', () => {
    it('should set status BANNED and audit with BAN action', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(user);
      mockUserAdminRepository.updateStatus.mockResolvedValue({ ...user, status: 'BANNED' });

      const result = await service.ban('user-1', 'admin-1', { reason: 'Fraud' });

      expect(result).toHaveProperty('status', 'BANNED');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'BAN' }));
    });
  });

  describe('reactivate', () => {
    it('should set status ACTIVE and audit with RESTORE action', async () => {
      mockUserAdminRepository.findById.mockResolvedValue({ ...user, status: 'SUSPENDED' });
      mockUserAdminRepository.updateStatus.mockResolvedValue({ ...user, status: 'ACTIVE' });

      const result = await service.reactivate('user-1', 'admin-1');

      expect(result).toHaveProperty('status', 'ACTIVE');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESTORE' }));
    });
  });
});
