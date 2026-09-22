import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { LEADERBOARD_CONSTANTS, LEADERBOARD_PERIODS, LeaderboardPeriod } from '../constants';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ enum: LEADERBOARD_PERIODS, default: LEADERBOARD_CONSTANTS.DEFAULT_PERIOD })
  @IsOptional()
  @IsIn(LEADERBOARD_PERIODS)
  period: LeaderboardPeriod = LEADERBOARD_CONSTANTS.DEFAULT_PERIOD;

  @ApiPropertyOptional({ default: LEADERBOARD_CONSTANTS.DEFAULT_LIMIT, maximum: LEADERBOARD_CONSTANTS.MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LEADERBOARD_CONSTANTS.MAX_LIMIT)
  limit: number = LEADERBOARD_CONSTANTS.DEFAULT_LIMIT;
}
