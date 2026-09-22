import { Logger, Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { RiskModule } from '../risk/risk.module';
import { TaskModule } from '../task/task.module';

import { AiAssistModule } from './ai-assist.module';
import { AdminAiProviderController, AiVerificationController, AiAssistController } from './controllers';
import { ApiKeyGuard } from './guards';
import {
  AiModelRepository,
  AiPromptTemplateRepository,
  AiProviderRepository,
  AiUsageLogRepository,
  AiVerificationJobRepository,
} from './repositories';
import { AiProviderAdminService, AiVerificationService } from './services';

@Module({
  imports: [TaskModule, AdminModule, AiAssistModule, RiskModule],
  controllers: [AiVerificationController, AdminAiProviderController, AiAssistController],
  providers: [
    AiVerificationService,
    AiVerificationJobRepository,
    ApiKeyGuard,
    AiProviderAdminService,
    AiProviderRepository,
    AiModelRepository,
    AiPromptTemplateRepository,
    AiUsageLogRepository,
  ],
  exports: [AiVerificationService, AiVerificationJobRepository],
})
export class AiModule {
  private readonly logger = new Logger(AiModule.name);

  constructor() {
    this.logger.log('AiModule initialized');
  }
}
