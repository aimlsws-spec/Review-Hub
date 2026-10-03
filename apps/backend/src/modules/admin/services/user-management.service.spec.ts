import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserAdminRepository } from '../repositories';

import { UserManagementService } from './user-management.service';

describe('UserManagementService', () => {
  let service: UserManagementService;

  const mockUserAdminRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    getRoleSlugs: jest.fn(),
    findRoleBySlug: jest.fn(),
    grantRole: jest.fn(),
    revokeRole: jest.fn(),
    revokeSessions: jest.fn(),
    getReferrals: jest.fn(),
    getReferrer: jest.fn(),
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

  describe('staff roles', () => {
    beforeEach(() => {
      mockUserAdminRepository.findById.mockResolvedValue(user);
      mockUserAdminRepository.findRoleBySlug.mockResolvedValue({ id: 'role-finance', slug: 'finance-team' });
    });

    it('lists roles as the token names them', async () => {
      mockUserAdminRepository.getRoleSlugs.mockResolvedValue(['admin', 'finance-team']);

      await expect(service.getRoles('user-1')).resolves.toEqual({ roles: ['ADMIN', 'FINANCE_TEAM'] });
    });

    it('gives the finance role and audits the change', async () => {
      mockUserAdminRepository.getRoleSlugs.mockResolvedValueOnce(['admin']).mockResolvedValueOnce(['admin', 'finance-team']);

      const result = await service.grantRole('user-1', 'FINANCE_TEAM', 'super-1');

      expect(mockUserAdminRepository.findRoleBySlug).toHaveBeenCalledWith('finance-team');
      expect(mockUserAdminRepository.grantRole).toHaveBeenCalledWith('user-1', 'role-finance', 'super-1');
      expect(mockUserAdminRepository.revokeSessions).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'super-1', entityId: 'user-1', before: { roles: ['ADMIN'] }, after: { roles: ['ADMIN', 'FINANCE_TEAM'] } }),
      );
      expect(result).toEqual({ roles: ['ADMIN', 'FINANCE_TEAM'] });
    });

    it('removes a role and signs the person out everywhere', async () => {
      mockUserAdminRepository.getRoleSlugs.mockResolvedValueOnce(['admin', 'finance-team']).mockResolvedValueOnce(['admin']);

      await service.revokeRole('user-1', 'FINANCE_TEAM', 'super-1');

      expect(mockUserAdminRepository.revokeRole).toHaveBeenCalledWith('user-1', 'role-finance');
      expect(mockUserAdminRepository.revokeSessions).toHaveBeenCalledWith('user-1');
    });

    it.each(['SUPER_ADMIN', 'MERCHANT', 'toString'])('refuses to hand out %s from here', async (role) => {
      await expect(service.grantRole('user-1', role, 'super-1')).rejects.toThrow(BadRequestException);
      expect(mockUserAdminRepository.grantRole).not.toHaveBeenCalled();
    });

    it('refuses an unknown user', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(null);

      await expect(service.grantRole('nobody', 'ADMIN', 'super-1')).rejects.toThrow(NotFoundException);
    });
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

  describe('getReferrals', () => {
    it('returns the direct referrals and the referrer together', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(user);
      mockUserAdminRepository.getReferrals.mockResolvedValue({ data: [{ id: 'r-1' }], total: 1, page: 1, limit: 20 });
      mockUserAdminRepository.getReferrer.mockResolvedValue({ id: 'r-0', referrerId: 'u-0', name: 'Meena K' });

      await expect(service.getReferrals('user-1', 1, 20)).resolves.toEqual({
        data: [{ id: 'r-1' }],
        total: 1,
        page: 1,
        limit: 20,
        referrer: { id: 'r-0', referrerId: 'u-0', name: 'Meena K' },
      });
    });

    it('refuses an unknown user', async () => {
      mockUserAdminRepository.findById.mockResolvedValue(null);

      await expect(service.getReferrals('nobody', 1, 20)).rejects.toThrow(NotFoundException);
    });
  });
});
