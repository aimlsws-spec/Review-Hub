import { Logger, Module } from '@nestjs/common';

import { AiAssistModule } from '../ai/ai-assist.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MerchantModule } from '../merchant/merchant.module';
import { RiskModule } from '../risk/risk.module';

import {
  CampaignTaskController,
  MerchantCampaignTaskController,
  SubmissionController,
  TaskParticipationController,
  TaskRecommendationController,
} from './controllers';
import {
  CampaignParticipantRepository,
  CampaignTaskRepository,
  TaskRecommendationRepository,
  TaskSubmissionRepository,
} from './repositories';
import { CampaignTaskService, SubmissionService, TaskParticipationService, TaskRecommendationService } from './services';

@Module({
  imports: [CampaignModule, AuthModule, MerchantModule, AiAssistModule, RiskModule],
  controllers: [
    MerchantCampaignTaskController,
    CampaignTaskController,
    TaskParticipationController,
    TaskRecommendationController,
    SubmissionController,
  ],
  providers: [
    CampaignTaskService,
    TaskParticipationService,
    SubmissionService,
    TaskRecommendationService,
    CampaignTaskRepository,
    CampaignParticipantRepository,
    TaskSubmissionRepository,
    TaskRecommendationRepository,
  ],
  // TaskSubmissionRepository is exported for the AI verification worker in JobsModule, which reads and updates
  // submissions directly. Without it the app fails to start with a dependency-injection error.
  exports: [CampaignTaskService, TaskParticipationService, SubmissionService, TaskRecommendationService, TaskSubmissionRepository],
})
export class TaskModule {
  private readonly logger = new Logger(TaskModule.name);

  constructor() {
    this.logger.log('TaskModule initialized');
  }
}
