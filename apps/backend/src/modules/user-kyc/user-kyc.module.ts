import { Logger, Module } from '@nestjs/common';

import { UserKycController } from './controllers';
import { UserKycDocumentRepository } from './repositories';
import { UserKycService } from './services';

@Module({
  controllers: [UserKycController],
  providers: [UserKycService, UserKycDocumentRepository],
  exports: [UserKycService],
})
export class UserKycModule {
  private readonly logger = new Logger(UserKycModule.name);

  constructor() {
    this.logger.log('UserKycModule initialized');
  }
}
