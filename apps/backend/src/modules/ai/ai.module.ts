import { Logger, Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { TaskModule } from '../task/task.module';

import { AiVerificationController } from './controllers';
import { ApiKeyGuard } from './guards';
import { AiVerificationJobRepository } from './repositories';
import { AiVerificationService } from './services';

@Module({
  imports: [TaskModule, AdminModule],
  controllers: [AiVerificationController],
  providers: [AiVerificationService, AiVerificationJobRepository, ApiKeyGuard],
  exports: [AiVerificationService],
})
export class AiModule {
  private readonly logger = new Logger(AiModule.name);

  constructor() {
    this.logger.log('AiModule initialized');
  }
}
