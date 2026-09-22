import { Module } from '@nestjs/common';

import { AppConfigController } from './controllers';
import { MaintenanceGuard } from './guards';
import { AppConfigService } from './services';

@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService, MaintenanceGuard],
  exports: [AppConfigService, MaintenanceGuard],
})
export class AppConfigModule {}
