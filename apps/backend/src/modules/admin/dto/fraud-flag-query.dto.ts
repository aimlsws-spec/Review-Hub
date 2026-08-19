import { ApiPropertyOptional } from '@nestjs/swagger';
import { FraudRiskLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class FraudFlagQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ enum: FraudRiskLevel })
  @IsOptional()
  @IsEnum(FraudRiskLevel)
  riskLevel?: FraudRiskLevel;
}
