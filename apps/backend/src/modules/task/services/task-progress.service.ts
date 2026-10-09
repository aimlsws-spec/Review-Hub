import { Injectable } from '@nestjs/common';
import { ParticipantStatus } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { CampaignRepository } from '../../campaign/repositories';
import { JoinedCampaignFilter, JoinedCampaignsQueryDto } from '../dto';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';
import { TaskAvailability, taskAvailability } from '../task-availability';

/** Participation statuses behind each filter of the person's "My campaigns" list. */
const STATUSES_FOR: Record<JoinedCampaignFilter, ParticipantStatus[]> = {
  IN_PROGRESS: ['JOINED', 'IN_PROGRESS'],
  COMPLETED: ['COMPLETED', 'REWARDED'],
};

/**
 * A person's own progress, for the app: which tasks of a campaign they can still do, and which campaigns they have
 * joined or completed. The same rules the submit step enforces decide what is open (task-availability.ts), so the app
 * never offers a task that would be refused.
 */
@Injectable()
export class TaskProgressService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignTaskRepository: CampaignTaskRepository,
    private readonly submissionRepository: TaskSubmissionRepository,
    private readonly participantRepository: CampaignParticipantRepository,
  ) {}

  /**
   * Each task of a campaign as it stands for this person. `allDone` is true when every task is completed for good,
   * so the campaign has nothing left for them; a task that repeats (daily, weekly...) is never done for good.
   */
  async campaignProgress(userId: string, campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');

    const [tasks, participant] = await Promise.all([
      this.campaignTaskRepository.findByCampaignId(campaignId),
      this.participantRepository.findByCampaignAndUser(campaignId, userId),
    ]);
    const own = await this.submissionRepository.findOwnForTasks(
      userId,
      tasks.map((task) => task.id),
    );

    const progress: (TaskAvailability & { taskId: string })[] = tasks.map((task) => ({
      taskId: task.id,
      ...taskAvailability(
        task,
        own.filter((submission) => submission.taskId === task.id),
      ),
    }));

    return {
      campaignId,
      joined: !!participant,
      allDone: progress.length > 0 && progress.every((task) => task.state === 'COMPLETED'),
      tasks: progress,
    };
  }

  /** The campaigns this person has joined, under way or completed, with how far they got and what they earned. */
  async joinedCampaigns(userId: string, query: JoinedCampaignsQueryDto) {
    const result = await this.participantRepository.findForUser({
      userId,
      statuses: STATUSES_FOR[query.status],
      page: query.page,
      limit: query.limit,
    });
    const earned = await this.participantRepository.sumCreditedRewards(
      userId,
      result.data.map((row) => row.campaign.id),
    );

    return {
      ...result,
      data: result.data.map((row) => ({
        campaignId: row.campaign.id,
        title: row.campaign.title,
        thumbnailUrl: row.campaign.thumbnailUrl,
        campaignType: row.campaign.campaignType,
        campaignStatus: row.campaign.status,
        businessName: row.campaign.merchant.businessName,
        rewardAmount: row.campaign.rewardAmount.toString(),
        participationStatus: row.status,
        joinedAt: row.joinedAt,
        completedAt: row.completedAt,
        tasksCompleted: row.tasksCompleted,
        tasksTotal: row.tasksTotal,
        earned: earned.get(row.campaign.id) ?? 0,
      })),
    };
  }
}
