import { Logger, Module } from '@nestjs/common';

import { AiAssistModule } from '../ai/ai-assist.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MerchantModule } from '../merchant/merchant.module';
import { RiskModule } from '../risk/risk.module';
import { SupportModule } from '../support/support.module';

import {
  CampaignTaskController,
  MerchantCampaignTaskController,
  MerchantSubmissionController,
  SubmissionController,
  TaskParticipationController,
  TaskProgressController,
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
  MerchantSubmissionService,
  QrScanVerificationService,
  SubmissionService,
  TaskParticipationService,
  TaskProgressService,
  TaskRecommendationService,
} from './services';
import { DisputeService } from './services/dispute.service';

@Module({
  imports: [CampaignModule, AuthModule, MerchantModule, AiAssistModule, RiskModule, SupportModule],
  controllers: [
    MerchantCampaignTaskController,
    CampaignTaskController,
    TaskParticipationController,
    TaskRecommendationController,
    TaskProgressController,
    SubmissionController,
    MerchantSubmissionController,
  ],
  providers: [
    DisputeService,
    DisputeRepository,
    CampaignTaskService,
    TaskParticipationService,
    SubmissionService,
    MerchantSubmissionService,
    TaskRecommendationService,
    TaskProgressService,
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
