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
});
