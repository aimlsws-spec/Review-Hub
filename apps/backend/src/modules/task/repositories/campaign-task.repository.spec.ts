import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CampaignTaskRepository } from './campaign-task.repository';

describe('CampaignTaskRepository', () => {
  let repository: CampaignTaskRepository;

  const mockPrisma = {
    campaignTask: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignTaskRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CampaignTaskRepository>(CampaignTaskRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should exclude deleted tasks', async () => {
      mockPrisma.campaignTask.findFirst.mockResolvedValue({ id: 'task-1' });

      const result = await repository.findById('task-1');
      expect(result).toEqual({ id: 'task-1' });
      expect(mockPrisma.campaignTask.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', deletedAt: null },
      });
    });
  });

  describe('findByCampaignId', () => {
    it('should order by taskOrder', async () => {
      mockPrisma.campaignTask.findMany.mockResolvedValue([{ id: 'task-1' }]);

      const result = await repository.findByCampaignId('campaign-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.campaignTask.findMany).toHaveBeenCalledWith({
        where: { campaignId: 'campaign-1', deletedAt: null },
        orderBy: { taskOrder: 'asc' },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      mockPrisma.campaignTask.update.mockResolvedValue({ id: 'task-1', deletedAt: new Date() });

      await repository.softDelete('task-1');
      expect(mockPrisma.campaignTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
