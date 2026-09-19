import { Logger, Module } from '@nestjs/common';

import { AiAssistModule } from '../ai/ai-assist.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MerchantModule } from '../merchant/merchant.module';

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
  imports: [CampaignModule, AuthModule, MerchantModule, AiAssistModule],
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
  exports: [CampaignTaskService, TaskParticipationService, SubmissionService, TaskRecommendationService],
})
export class TaskModule {
  private readonly logger = new Logger(TaskModule.name);

  constructor() {
    this.logger.log('TaskModule initialized');
  }
}
