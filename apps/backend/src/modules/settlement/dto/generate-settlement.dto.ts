import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/** Both fields omitted means "the prior UTC day" — the same period the nightly job runs. */
export class GenerateSettlementDto {
  @ApiPropertyOptional({ example: '2026-08-30T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-08-31T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  periodEnd?: string;
}
