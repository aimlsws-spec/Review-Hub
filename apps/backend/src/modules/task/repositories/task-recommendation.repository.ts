import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BLOCKING_SUBMISSION_STATUSES } from '../constants';

@Injectable()
export class TaskRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Open tasks on active public campaigns the user hasn't already engaged with (mirrors the resubmission-blocking rule in `submitTask`). */
  async findCandidateTasks(userId: string) {
    return this.prisma.campaignTask.findMany({
      where: {
        deletedAt: null,
        campaign: { status: 'ACTIVE' as never, visibility: 'PUBLIC' as never, deletedAt: null },
        submissions: {
          none: { userId, status: { in: BLOCKING_SUBMISSION_STATUSES as never } },
        },
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
