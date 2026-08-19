import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { FraudFlagRepository } from './fraud-flag.repository';

describe('FraudFlagRepository', () => {
  let repository: FraudFlagRepository;

  const mockPrisma = {
    submissionFraudFlag: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudFlagRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<FraudFlagRepository>(FraudFlagRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by resolved and riskLevel', async () => {
      mockPrisma.submissionFraudFlag.findMany.mockResolvedValue([{ id: 'flag-1' }]);
      mockPrisma.submissionFraudFlag.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 20, resolved: false, riskLevel: 'HIGH' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.submissionFraudFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { resolved: false, riskLevel: 'HIGH' } }),
      );
    });
  });

  describe('resolve', () => {
    it('should mark the flag resolved with the resolver and timestamp', async () => {
      mockPrisma.submissionFraudFlag.update.mockResolvedValue({ id: 'flag-1', resolved: true });

      await repository.resolve('flag-1', 'admin-1');
      expect(mockPrisma.submissionFraudFlag.update).toHaveBeenCalledWith({
        where: { id: 'flag-1' },
        data: { resolved: true, resolvedBy: 'admin-1', resolvedAt: expect.any(Date) },
      });
    });
  });
});
