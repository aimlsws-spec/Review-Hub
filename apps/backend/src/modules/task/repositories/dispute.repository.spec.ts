import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { DisputeRepository } from './dispute.repository';

describe('DisputeRepository', () => {
  let repository: DisputeRepository;

  const mockPrisma = {
    dispute: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisputeRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<DisputeRepository>(DisputeRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('never selects the user\'s passwordHash or other credential fields', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({ id: 'dispute-1' });

      await repository.findById('dispute-1');

      const args = mockPrisma.dispute.findUnique.mock.calls[0][0];
      expect(args.include.user.select).toEqual({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
      });
      expect(args.include.user.select.passwordHash).toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('also restricts the user fields in a list', async () => {
      mockPrisma.dispute.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 20 });

      const args = mockPrisma.dispute.findMany.mock.calls[0][0];
      expect(args.include.user.select.passwordHash).toBeUndefined();
      expect(args.include.user.select.email).toBe(true);
    });

    it('filters by status when given', async () => {
      mockPrisma.dispute.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 20, status: 'OPEN' });

      expect(mockPrisma.dispute.findMany.mock.calls[0][0].where).toEqual({ status: 'OPEN' });
    });

    it('does not filter by status when none is given', async () => {
      mockPrisma.dispute.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 20 });

      expect(mockPrisma.dispute.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('count', () => {
    it('filters by status when given', async () => {
      mockPrisma.dispute.count.mockResolvedValue(3);

      const result = await repository.count({ status: 'UPHELD' });

      expect(result).toBe(3);
      expect(mockPrisma.dispute.count).toHaveBeenCalledWith({ where: { status: 'UPHELD' } });
    });
  });
});
