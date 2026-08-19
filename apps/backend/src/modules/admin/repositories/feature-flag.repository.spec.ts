import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { FeatureFlagRepository } from './feature-flag.repository';

describe('FeatureFlagRepository', () => {
  let repository: FeatureFlagRepository;

  const mockPrisma = {
    featureFlag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<FeatureFlagRepository>(FeatureFlagRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should exclude soft-deleted flags, ordered by key', async () => {
      mockPrisma.featureFlag.findMany.mockResolvedValue([{ key: 'ai_verification' }]);

      await repository.findAll();
      expect(mockPrisma.featureFlag.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { key: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update a flag by key', async () => {
      mockPrisma.featureFlag.update.mockResolvedValue({ key: 'ai_verification', enabled: true });

      await repository.update('ai_verification', { enabled: true });
      expect(mockPrisma.featureFlag.update).toHaveBeenCalledWith({
        where: { key: 'ai_verification' },
        data: { enabled: true },
      });
    });
  });
});
