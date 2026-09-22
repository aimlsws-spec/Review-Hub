import { Logger, Module } from '@nestjs/common';

import { LeaderboardController } from './controllers';
import { LeaderboardRepository } from './repositories';
import { LeaderboardService } from './services';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardRepository],
})
export class LeaderboardModule {
  private readonly logger = new Logger(LeaderboardModule.name);

  constructor() {
    this.logger.log('LeaderboardModule initialized');
  }
}
