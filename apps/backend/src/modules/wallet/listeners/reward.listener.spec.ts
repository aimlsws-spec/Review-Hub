import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { SubmissionApprovedEvent } from '../../task/events';

import { RewardListener } from './reward.listener';

describe('RewardListener', () => {
  let listener: RewardListener;

  const mockRewardQueue = { add: jest.fn() };

  const event = new SubmissionApprovedEvent('submission-1', 'task-1', 'campaign-1', 'user-1', 50);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardListener,
        { provide: getQueueToken(QUEUE_NAMES.REWARDS), useValue: mockRewardQueue },
      ],
    }).compile();

    listener = module.get<RewardListener>(RewardListener);
    jest.clearAllMocks();
  });

  it('should enqueue a "credit" job on the rewards queue instead of crediting inline', async () => {
    await listener.handleSubmissionApproved(event);

    expect(mockRewardQueue.add).toHaveBeenCalledWith('credit', {
      submissionId: 'submission-1',
      taskId: 'task-1',
      campaignId: 'campaign-1',
      userId: 'user-1',
      rewardAmount: 50,
    });
  });
});
