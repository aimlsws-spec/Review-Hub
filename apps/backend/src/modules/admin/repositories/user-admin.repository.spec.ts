import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserAdminRepository } from './user-admin.repository';

describe('UserAdminRepository', () => {
  let repository: UserAdminRepository;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userRole: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    role: { findFirst: jest.fn() },
    userSession: { updateMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserAdminRepository>(UserAdminRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by status and search terms', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 20, status: 'SUSPENDED', search: 'jane' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SUSPENDED', OR: expect.any(Array) }),
        }),
      );
    });

    it('should never select passwordHash', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20 });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.select).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateStatus', () => {
    it('should update the user status', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', status: 'BANNED' });

      const result = await repository.updateStatus('user-1', 'BANNED');
      expect(result).toHaveProperty('status', 'BANNED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { status: 'BANNED' } }),
      );
    });
  });

  describe('roles', () => {
    it('reads the slugs of the roles a user holds', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([{ role: { slug: 'admin' } }, { role: { slug: 'finance-team' } }]);

      await expect(repository.getRoleSlugs('user-1')).resolves.toEqual(['admin', 'finance-team']);
    });

    it('finds only a role that has not been deleted', async () => {
      await repository.findRoleBySlug('finance-team');

      expect(mockPrisma.role.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'finance-team', deletedAt: null } }));
    });

    it('gives a role without failing when the user already has it, recording who gave it', async () => {
      await repository.grantRole('user-1', 'role-1', 'super-1');

      expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
        where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
        update: {},
        create: { userId: 'user-1', roleId: 'role-1', assignedBy: 'super-1' },
      });
    });

    it('removes a role, and ends only active sessions', async () => {
      await repository.revokeRole('user-1', 'role-1');
      await repository.revokeSessions('user-1');

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', roleId: 'role-1' } });
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: expect.any(Date) },
      });
    });
  });
});
