import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';

import { UserKycController } from './controllers';
import { UserKycDocumentRepository } from './repositories';
import { KycOcrService, UserKycService } from './services';

@Module({
  imports: [HttpModule],
  controllers: [UserKycController],
  providers: [UserKycService, KycOcrService, UserKycDocumentRepository],
  exports: [UserKycService, UserKycDocumentRepository],
})
export class UserKycModule {
  private readonly logger = new Logger(UserKycModule.name);

  constructor() {
    this.logger.log('UserKycModule initialized');
  }
}
