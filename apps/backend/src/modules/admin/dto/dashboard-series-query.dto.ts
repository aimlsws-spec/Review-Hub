import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** How many India days, ending today, the dashboard charts cover. */
export class DashboardSeriesQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 7, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number;
}
