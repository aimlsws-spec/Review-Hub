import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { LeaderboardQueryDto, LeaderboardVisibilityDto } from '../dto';
import { LeaderboardService } from '../services';

@ApiTags(SWAGGER_TAGS.LEADERBOARD)
@ApiBearerAuth()
@Controller({ path: 'leaderboard', version: '1' })
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top earners this month or of all time, and where I stand' })
  async view(@CurrentUser('id') userId: string, @Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.view(userId, query);
  }

  @Patch('me/visibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Show me on the leaderboard, or keep me off it' })
  async setVisibility(@CurrentUser('id') userId: string, @Body() dto: LeaderboardVisibilityDto) {
    return this.leaderboardService.setVisibility(userId, dto.visible);
  }
}
