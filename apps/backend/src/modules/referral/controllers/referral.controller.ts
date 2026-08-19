import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { ReferralQueryDto } from '../dto';
import { ReferralService } from '../services';

@ApiTags(SWAGGER_TAGS.REFERRALS)
@Controller({ path: 'referrals', version: '1' })
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List people I have referred' })
  async listMine(@CurrentUser('id') userId: string, @Query() query: ReferralQueryDto) {
    return this.referralService.listMine(userId, query);
  }

  @Get('me/stats')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My referral summary: total referred and total bonus earned' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.referralService.getMyStats(userId);
  }
}
