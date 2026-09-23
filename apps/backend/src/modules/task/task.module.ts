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
import { DisputeRepository } from './repositories/dispute.repository';
import {
  CampaignTaskService,
  LocationCheckinVerificationService,
  QrScanVerificationService,
  SubmissionService,
  TaskParticipationService,
  TaskRecommendationService,
} from './services';
import { DisputeService } from './services/dispute.service';

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
    DisputeService,
    DisputeRepository,
    CampaignTaskService,
    TaskParticipationService,
    SubmissionService,
    TaskRecommendationService,
    QrScanVerificationService,
    LocationCheckinVerificationService,
    CampaignTaskRepository,
    CampaignParticipantRepository,
    TaskSubmissionRepository,
    TaskRecommendationRepository,
  ],
  // TaskSubmissionRepository is exported for the AI verification worker in JobsModule, which reads and updates
  // submissions directly. Without it the app fails to start with a dependency-injection error.
  // DisputeService is exported for AdminModule's dispute review queue.
  exports: [
    DisputeService,
    CampaignTaskService,
    TaskParticipationService,
    SubmissionService,
    TaskRecommendationService,
    TaskSubmissionRepository,
  ],
})
export class TaskModule {
  private readonly logger = new Logger(TaskModule.name);

  constructor() {
    this.logger.log('TaskModule initialized');
  }
}
