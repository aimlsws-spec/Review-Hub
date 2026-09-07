import { Module } from '@nestjs/common';

import { AdminHealthController } from './admin-health.controller';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HealthCheckRepository, SystemMetricRepository } from './repositories';

@Module({
  controllers: [HealthController, AdminHealthController],
  providers: [HealthService, HealthCheckRepository, SystemMetricRepository],
})
export class HealthModule {}
