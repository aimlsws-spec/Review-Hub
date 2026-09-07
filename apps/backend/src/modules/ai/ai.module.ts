import { Logger, Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { TaskModule } from '../task/task.module';

import { AdminAiProviderController, AiVerificationController } from './controllers';
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
  imports: [TaskModule, AdminModule],
  controllers: [AiVerificationController, AdminAiProviderController],
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
  exports: [AiVerificationService],
})
export class AiModule {
  private readonly logger = new Logger(AiModule.name);

  constructor() {
    this.logger.log('AiModule initialized');
  }
}
