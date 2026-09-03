import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class HighRiskDeviceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: 40, minimum: 0, maximum: 100, description: 'Minimum riskScore to include' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minRiskScore: number = 40;
}
