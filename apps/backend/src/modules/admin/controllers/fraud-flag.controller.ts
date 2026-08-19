import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { FraudFlagQueryDto } from '../dto';
import { FraudReviewService } from '../services';

@ApiTags(SWAGGER_TAGS.FRAUD)
@Controller({ path: 'admin/fraud-flags', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class FraudFlagController {
  constructor(private readonly fraudReviewService: FraudReviewService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List submission fraud flags' })
  async list(@Query() query: FraudFlagQueryDto) {
    return this.fraudReviewService.list(query);
  }

  @Post(':flagId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a fraud flag as resolved' })
  async resolve(@Param('flagId') flagId: string, @CurrentUser('id') adminId: string) {
    return this.fraudReviewService.resolve(flagId, adminId);
  }
}
