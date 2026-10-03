import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { TaskRecommendationRepository } from './task-recommendation.repository';

describe('TaskRecommendationRepository', () => {
  let repository: TaskRecommendationRepository;

  const mockPrisma = {
    campaignTask: { findMany: jest.fn() },
    taskSubmission: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskRecommendationRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<TaskRecommendationRepository>(TaskRecommendationRepository);
    jest.clearAllMocks();
  });

  describe('findCandidateTasks', () => {
    it('hides a once-only task once done, but a repeatable one only while a submission is being checked', async () => {
      mockPrisma.campaignTask.findMany.mockResolvedValue([]);

      await repository.findCandidateTasks('user-1');

      const where = mockPrisma.campaignTask.findMany.mock.calls[0][0].where;
      expect(where.campaign).toEqual({ status: 'ACTIVE', visibility: 'PUBLIC', deletedAt: null });
      expect(where.OR).toEqual([
        {
          completionLimit: 'ONCE',
          submissions: { none: { userId: 'user-1', status: { in: ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL', 'APPROVED'] } } },
        },
        {
          completionLimit: { not: 'ONCE' },
          submissions: { none: { userId: 'user-1', status: { in: ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'] } } },
        },
      ]);
    });
  });

  describe('getUserCategoryAffinity', () => {
    it("tallies the campaign types of the user's approved submissions", async () => {
      mockPrisma.taskSubmission.findMany.mockResolvedValue([
        { task: { campaign: { campaignType: 'REVIEW' } } },
        { task: { campaign: { campaignType: 'REVIEW' } } },
        { task: { campaign: { campaignType: 'SURVEY' } } },
      ]);

      await expect(repository.getUserCategoryAffinity('user-1')).resolves.toEqual({ REVIEW: 2, SURVEY: 1 });
    });
  });
});
