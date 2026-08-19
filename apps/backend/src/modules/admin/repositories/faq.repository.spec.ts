import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { FaqRepository } from './faq.repository';

describe('FaqRepository', () => {
  let repository: FaqRepository;

  const mockPrisma = {
    fAQ: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<FaqRepository>(FaqRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by category and isActive, ordered by category then sortOrder', async () => {
      mockPrisma.fAQ.findMany.mockResolvedValue([{ id: 'faq-1' }]);
      mockPrisma.fAQ.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 20, category: 'Rewards', isActive: true });
      expect(mockPrisma.fAQ.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, category: 'Rewards', isActive: true },
          orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      mockPrisma.fAQ.update.mockResolvedValue({ id: 'faq-1', deletedAt: new Date() });

      await repository.softDelete('faq-1');
      expect(mockPrisma.fAQ.update).toHaveBeenCalledWith({
        where: { id: 'faq-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
