import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

/** The periods a merchant can look at. Fixed choices keep every request cheap and every chart the same shape. */
export const ANALYTICS_PERIODS = [7, 30, 90] as const;

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_PERIODS, default: 30, description: 'How many days back to look, ending today (India time)' })
  @IsOptional()
  @Type(() => Number)
  @IsIn(ANALYTICS_PERIODS)
  days: number = 30;
}
