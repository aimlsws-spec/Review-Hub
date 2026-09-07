import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class DailyAnalyticsQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsISO8601()
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsISO8601()
  to!: string;
}
