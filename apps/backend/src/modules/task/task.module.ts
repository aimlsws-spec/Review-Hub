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
} from './controllers';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from './repositories';
import { CampaignTaskService, SubmissionService, TaskParticipationService } from './services';

@Module({
  imports: [CampaignModule, AuthModule, MerchantModule, AiAssistModule],
  controllers: [
    MerchantCampaignTaskController,
    CampaignTaskController,
    TaskParticipationController,
    SubmissionController,
  ],
  providers: [
    CampaignTaskService,
    TaskParticipationService,
    SubmissionService,
    CampaignTaskRepository,
    CampaignParticipantRepository,
    TaskSubmissionRepository,
  ],
  exports: [CampaignTaskService, TaskParticipationService, SubmissionService],
})
export class TaskModule {
  private readonly logger = new Logger(TaskModule.name);

  constructor() {
    this.logger.log('TaskModule initialized');
  }
}
