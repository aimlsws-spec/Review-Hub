import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantRepository } from './merchant.repository';

describe('MerchantRepository', () => {
  let repository: MerchantRepository;

  const mockPrisma = {
    merchant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MerchantRepository>(MerchantRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call prisma with correct args', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' });

      const result = await repository.findById('merchant-1');
      expect(result).toEqual({ id: 'merchant-1' });
      expect(mockPrisma.merchant.findUnique).toHaveBeenCalledWith({
        where: { id: 'merchant-1' },
        include: { country: true, state: true, city: true, wallet: true },
      });
    });
  });

  describe('findByEmail', () => {
    it('should find merchant by email', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1', email: 'test@test.com' });

      const result = await repository.findByEmail('test@test.com');
      expect(result).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('create', () => {
    it('should create a merchant', async () => {
      const data = { businessName: 'Acme Corp', email: 'test@test.com', phone: '+911234567890' };
      mockPrisma.merchant.create.mockResolvedValue({ id: 'new-id', ...data });

      const result = await repository.create(data as never);
      expect(result).toHaveProperty('id', 'new-id');
    });
  });

  describe('findWithFilters', () => {
    it('should return paginated results', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: 'merchant-1' }]);
      mockPrisma.merchant.count.mockResolvedValue(1);

      const result = await repository.findWithFilters({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);

      await repository.findWithFilters({ page: 1, limit: 20, status: 'ACTIVE' });
      expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });
});
