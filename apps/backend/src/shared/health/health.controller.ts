import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '../../common/constants';
import { Public } from '../../common/decorators/public.decorator';

import { HealthService } from './health.service';

@ApiTags(SWAGGER_TAGS.HEALTH)
@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full platform health check' })
  check() {
    return this.health.check();
  }

  @Get('db')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Database health check' })
  checkDb() {
    return this.health.checkDatabase();
  }

  @Get('cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redis cache health check' })
  checkCache() {
    return this.health.checkCache();
  }

  @Get('queue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue health check' })
  checkQueue() {
    // BullMQ uses Redis — same check
    return this.health.checkCache();
  }

  @Get('storage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Storage health check' })
  checkStorage() {
    return this.health.checkStorage();
  }
}
