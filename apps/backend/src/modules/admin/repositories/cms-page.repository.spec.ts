import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CmsPageRepository } from './cms-page.repository';

describe('CmsPageRepository', () => {
  let repository: CmsPageRepository;

  const mockPrisma = {
    cMSPage: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsPageRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CmsPageRepository>(CmsPageRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should exclude soft-deleted pages and filter by status', async () => {
      mockPrisma.cMSPage.findMany.mockResolvedValue([{ id: 'page-1' }]);
      mockPrisma.cMSPage.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 20, status: 'PUBLISHED' });
      expect(mockPrisma.cMSPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      );
    });
  });

  describe('findBySlug', () => {
    it('should look up by unique slug', async () => {
      mockPrisma.cMSPage.findUnique.mockResolvedValue({ id: 'page-1', slug: 'about-us' });

      const result = await repository.findBySlug('about-us');
      expect(result).toHaveProperty('slug', 'about-us');
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      mockPrisma.cMSPage.update.mockResolvedValue({ id: 'page-1', deletedAt: new Date() });

      await repository.softDelete('page-1');
      expect(mockPrisma.cMSPage.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
