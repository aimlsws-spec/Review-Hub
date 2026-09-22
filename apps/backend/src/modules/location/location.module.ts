import { Logger, Module } from '@nestjs/common';

import { LocationController } from './controllers/location.controller';
import { LocationRepository } from './repositories/location.repository';
import { LocationService } from './services/location.service';

/** States and cities. A leaf module: it depends on nothing but the database, so any module can import it. */
@Module({
  controllers: [LocationController],
  providers: [LocationService, LocationRepository],
  exports: [LocationService],
})
export class LocationModule {
  private readonly logger = new Logger(LocationModule.name);

  constructor() {
    this.logger.log('LocationModule initialized');
  }
}
