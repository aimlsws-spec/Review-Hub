import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { TaskProgressService } from './task-progress.service';

describe('TaskProgressService', () => {
  const campaignRepository = { findById: jest.fn() };
  const campaignTaskRepository = { findByCampaignId: jest.fn() };
  const submissionRepository = { findOwnForTasks: jest.fn() };
  const participantRepository = { findByCampaignAndUser: jest.fn(), findForUser: jest.fn(), sumCreditedRewards: jest.fn() };
  const service = new TaskProgressService(
    campaignRepository as never,
    campaignTaskRepository as never,
    submissionRepository as never,
    participantRepository as never,
  );

  const followTask = { id: 'task-follow', completionLimit: 'ONCE', maxCompletionsPerPeriod: 1 };
  const reviewTask = { id: 'task-review', completionLimit: 'ONCE', maxCompletionsPerPeriod: 1 };

  beforeEach(() => {
    jest.resetAllMocks();
    campaignRepository.findById.mockResolvedValue({ id: 'campaign-1' });
    campaignTaskRepository.findByCampaignId.mockResolvedValue([followTask, reviewTask]);
    participantRepository.findByCampaignAndUser.mockResolvedValue({ status: 'IN_PROGRESS' });
  });

  describe('campaignProgress', () => {
    it('says for each task whether this person can still do it', async () => {
      submissionRepository.findOwnForTasks.mockResolvedValue([{ taskId: 'task-follow', status: 'APPROVED', createdAt: new Date() }]);

      const result = await service.campaignProgress('user-1', 'campaign-1');

      expect(submissionRepository.findOwnForTasks).toHaveBeenCalledWith('user-1', ['task-follow', 'task-review']);
      expect(result).toMatchObject({
        campaignId: 'campaign-1',
        joined: true,
        allDone: false,
        tasks: [
          { taskId: 'task-follow', state: 'COMPLETED', timesCompleted: 1 },
          { taskId: 'task-review', state: 'AVAILABLE', timesCompleted: 0 },
        ],
      });
    });

    it('marks the campaign all done when every task is completed for good', async () => {
      submissionRepository.findOwnForTasks.mockResolvedValue([
        { taskId: 'task-follow', status: 'APPROVED', createdAt: new Date() },
        { taskId: 'task-review', status: 'APPROVED', createdAt: new Date() },
      ]);

      expect(await service.campaignProgress('user-1', 'campaign-1')).toMatchObject({ allDone: true });
    });

    it('is not all done while a task waits for review', async () => {
      submissionRepository.findOwnForTasks.mockResolvedValue([
        { taskId: 'task-follow', status: 'APPROVED', createdAt: new Date() },
        { taskId: 'task-review', status: 'PENDING_MANUAL', createdAt: new Date() },
      ]);

      const result = await service.campaignProgress('user-1', 'campaign-1');
      expect(result.allDone).toBe(false);
      expect(result.tasks[1].state).toBe('IN_REVIEW');
    });

    it('reports a campaign that does not exist', async () => {
      campaignRepository.findById.mockResolvedValue(null);
      await expect(service.campaignProgress('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinedCampaigns', () => {
    const row = {
      status: 'COMPLETED',
      joinedAt: new Date('2026-10-09T07:00:00Z'),
      completedAt: new Date('2026-10-09T07:30:00Z'),
      tasksCompleted: 1,
      tasksTotal: 1,
      campaign: {
        id: 'campaign-1',
        title: 'Like Our Diwali Post',
        thumbnailUrl: '/campaign/3f2a.jpg',
        campaignType: 'SOCIAL_FOLLOW',
        status: 'ACTIVE',
        rewardAmount: { toString: () => '10' },
        endAt: null,
        merchant: { businessName: 'Prerna Test Cafe' },
      },
    };

    it('lists the completed campaigns with what the person earned in each', async () => {
      participantRepository.findForUser.mockResolvedValue({ data: [row], total: 1, page: 1, limit: 20 });
      participantRepository.sumCreditedRewards.mockResolvedValue(new Map([['campaign-1', 10]]));

      const result = await service.joinedCampaigns('user-1', { status: 'COMPLETED', page: 1, limit: 20 } as never);

      expect(participantRepository.findForUser).toHaveBeenCalledWith({ userId: 'user-1', statuses: ['COMPLETED', 'REWARDED'], page: 1, limit: 20 });
      expect(result.data[0]).toMatchObject({
        campaignId: 'campaign-1',
        title: 'Like Our Diwali Post',
        businessName: 'Prerna Test Cafe',
        participationStatus: 'COMPLETED',
        rewardAmount: '10',
        earned: 10,
      });
    });

    it('lists campaigns still under way, showing nothing earned yet as 0', async () => {
      participantRepository.findForUser.mockResolvedValue({ data: [{ ...row, status: 'IN_PROGRESS' }], total: 1, page: 1, limit: 20 });
      participantRepository.sumCreditedRewards.mockResolvedValue(new Map());

      const result = await service.joinedCampaigns('user-1', { status: 'IN_PROGRESS', page: 1, limit: 20 } as never);

      expect(participantRepository.findForUser).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['JOINED', 'IN_PROGRESS'] }));
      expect(result.data[0].earned).toBe(0);
    });
  });
});
