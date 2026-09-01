import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { DailyRewardService, GamificationService } from '../services';

@ApiTags(SWAGGER_TAGS.GAMIFICATION)
@Controller({ path: 'gamification', version: '1' })
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly dailyRewardService: DailyRewardService,
  ) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my level, XP, and streak' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.gamificationService.getProfile(userId);
  }

  @Get('badges')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active badges, flagged with which ones I have earned' })
  async getBadges(@CurrentUser('id') userId: string) {
    return this.gamificationService.getBadges(userId);
  }

  @Post('daily-reward/claim')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Claim today's reward (daily bonus / spin wheel / scratch card)" })
  async claimDailyReward(@CurrentUser('id') userId: string) {
    return this.dailyRewardService.claim(userId);
  }
}
