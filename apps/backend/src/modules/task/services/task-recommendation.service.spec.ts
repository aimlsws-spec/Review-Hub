import { Test, TestingModule } from '@nestjs/testing';

import { TaskRecommendationRepository } from '../repositories';

import { TaskRecommendationService } from './task-recommendation.service';

describe('TaskRecommendationService', () => {
  let service: TaskRecommendationService;

  const mockRepository = {
    findCandidateTasks: jest.fn(),
    getUserCategoryAffinity: jest.fn(),
  };

  const makeTask = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'task-1',
    campaignId: 'campaign-1',
    title: 'Follow on Instagram',
    minimumTimeSeconds: 60,
    rewardAmount: '50.00',
    campaign: { title: 'Summer Sale', thumbnailUrl: 'https://example.com/thumb.jpg', campaignType: 'SOCIAL_MEDIA' },
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskRecommendationService, { provide: TaskRecommendationRepository, useValue: mockRepository }],
    }).compile();

    service = module.get(TaskRecommendationService);
  });

  it('returns an empty list when there are no candidate tasks (cold start, no history)', async () => {
    mockRepository.findCandidateTasks.mockResolvedValue([]);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({});

    const result = await service.getRecommended('user-1');

    expect(result).toEqual([]);
  });

  it('does not crash with an empty affinity map (cold-start-safe scoring)', async () => {
    mockRepository.findCandidateTasks.mockResolvedValue([makeTask()]);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({});

    const result = await service.getRecommended('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe('task-1');
  });

  it('flags a task at/above the high-reward threshold', async () => {
    mockRepository.findCandidateTasks.mockResolvedValue([makeTask({ id: 'high', rewardAmount: '150.00' })]);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({});

    const [result] = await service.getRecommended('user-1');

    expect(result.isHighReward).toBe(true);
  });

  it('flags a quick task (minimumTimeSeconds within the quick-task window)', async () => {
    mockRepository.findCandidateTasks.mockResolvedValue([makeTask({ id: 'quick', minimumTimeSeconds: 120 })]);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({});

    const [result] = await service.getRecommended('user-1');

    expect(result.isQuickTask).toBe(true);
  });

  it('ranks a task in the user\'s most-frequent category above an equally-rewarded task outside it', async () => {
    const affineTask = makeTask({
      id: 'affine',
      rewardAmount: '50.00',
      campaign: { title: 'A', thumbnailUrl: null, campaignType: 'SOCIAL_MEDIA' },
    });
    const otherTask = makeTask({
      id: 'other',
      rewardAmount: '50.00',
      campaign: { title: 'B', thumbnailUrl: null, campaignType: 'SURVEY' },
    });
    mockRepository.findCandidateTasks.mockResolvedValue([otherTask, affineTask]);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({ SOCIAL_MEDIA: 5 });

    const result = await service.getRecommended('user-1');

    expect(result[0].taskId).toBe('affine');
    expect(result[1].taskId).toBe('other');
  });

  it('caps the result at the recommended-tasks limit', async () => {
    const tasks = Array.from({ length: 25 }, (_, i) => makeTask({ id: `task-${i}` }));
    mockRepository.findCandidateTasks.mockResolvedValue(tasks);
    mockRepository.getUserCategoryAffinity.mockResolvedValue({});

    const result = await service.getRecommended('user-1');

    expect(result.length).toBeLessThanOrEqual(10);
  });
});
