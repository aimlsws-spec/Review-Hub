import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CityRepository } from './city.repository';

describe('CityRepository', () => {
  let repository: CityRepository;

  const mockPrisma = {
    state: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    city: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CityRepository>(CityRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should only return active cities by default', async () => {
      mockPrisma.city.findMany.mockResolvedValue([]);
      mockPrisma.city.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20 });
      expect(mockPrisma.city.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should include inactive cities when asked, and filter to one state', async () => {
      mockPrisma.city.findMany.mockResolvedValue([]);
      mockPrisma.city.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20, stateId: 'state-1', includeInactive: true });
      expect(mockPrisma.city.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stateId: 'state-1' } }),
      );
    });
  });

  describe('findAllStates', () => {
    it('should only return active states', async () => {
      mockPrisma.state.findMany.mockResolvedValue([]);

      await repository.findAllStates();
      expect(mockPrisma.state.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });
});
