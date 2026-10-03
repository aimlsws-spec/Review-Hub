import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BLOCKING_SUBMISSION_STATUSES, IN_FLIGHT_SUBMISSION_STATUSES } from '../constants';

@Injectable()
export class TaskRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open tasks on active public campaigns the user can still do. A once-only task drops out once submitted or
   * approved; a repeatable one (daily/weekly/monthly) only while a submission for it is being checked, so it comes back
   * the next period. Whether this period's limit is used up is checked when they submit, not here.
   */
  async findCandidateTasks(userId: string) {
    return this.prisma.campaignTask.findMany({
      where: {
        deletedAt: null,
        campaign: { status: 'ACTIVE' as never, visibility: 'PUBLIC' as never, deletedAt: null },
        OR: [
          { completionLimit: 'ONCE', submissions: { none: { userId, status: { in: [...BLOCKING_SUBMISSION_STATUSES] } } } },
          { completionLimit: { not: 'ONCE' }, submissions: { none: { userId, status: { in: [...IN_FLIGHT_SUBMISSION_STATUSES] } } } },
        ],
      },
      include: { campaign: true },
    });
  }

  /** Tallies campaign-type frequency across the user's own approved submissions — a bounded per-user set, not a full-table scan. */
  async getUserCategoryAffinity(userId: string): Promise<Record<string, number>> {
    const approved = await this.prisma.taskSubmission.findMany({
      where: { userId, status: 'APPROVED' as never },
      select: { task: { select: { campaign: { select: { campaignType: true } } } } },
    });

    const tally: Record<string, number> = {};
    for (const submission of approved) {
      const type = submission.task.campaign.campaignType;
      tally[type] = (tally[type] ?? 0) + 1;
    }
    return tally;
  }
}
