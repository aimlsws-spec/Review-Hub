import { Injectable } from '@nestjs/common';

import { HIGH_REWARD_THRESHOLD, QUICK_TASK_SECONDS, RECOMMENDED_TASKS_LIMIT } from '../constants';
import { RecommendedTaskDto } from '../dto';
import { TaskRecommendationRepository } from '../repositories';

/**
 * Powers the Home screen "✨ AI Recommended Tasks" carousel. This is a
 * transparent, rule-based heuristic — reward size, task speed, and the
 * user's own category history — not ML/LLM scoring. Same "AI" branding
 * precedent already established by this codebase's fraud engine, which is
 * also rule-based.
 *
 * TODO(geolocation): the reference design's "📍 Nearby" tag needs real GPS
 * permission + distance math, unrelated to ranking-by-history — not
 * attempted here.
 */
@Injectable()
export class TaskRecommendationService {
  constructor(private readonly repository: TaskRecommendationRepository) {}

  async getRecommended(userId: string): Promise<RecommendedTaskDto[]> {
    const [candidates, affinity] = await Promise.all([
      this.repository.findCandidateTasks(userId),
      this.repository.getUserCategoryAffinity(userId),
    ]);

    const maxAffinity = Math.max(1, ...Object.values(affinity));

    const scored = candidates.map((task) => {
      const reward = Number(task.rewardAmount ?? 0);
      const isQuickTask = task.minimumTimeSeconds > 0 && task.minimumTimeSeconds <= QUICK_TASK_SECONDS;
      const isHighReward = reward >= HIGH_REWARD_THRESHOLD;
      const rewardScore = Math.min(reward / HIGH_REWARD_THRESHOLD, 1);
      const categoryScore = (affinity[task.campaign.campaignType] ?? 0) / maxAffinity;

      const score = rewardScore * 0.5 + (isQuickTask ? 1 : 0) * 0.2 + categoryScore * 0.3;

      return { task, score, isHighReward, isQuickTask };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, RECOMMENDED_TASKS_LIMIT).map(({ task, isHighReward, isQuickTask }) => ({
      taskId: task.id,
      campaignId: task.campaignId,
      title: task.title,
      campaignTitle: task.campaign.title,
      thumbnailUrl: task.campaign.thumbnailUrl,
      rewardAmount: (task.rewardAmount ?? 0).toString(),
      minimumTimeSeconds: task.minimumTimeSeconds,
      isHighReward,
      isQuickTask,
    }));
  }
}
