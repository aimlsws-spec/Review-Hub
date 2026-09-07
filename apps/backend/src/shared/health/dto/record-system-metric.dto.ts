import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordSystemMetricDto {
  @ApiProperty({ example: 'queue.rewards.waiting_count' })
  @IsString()
  metric!: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({ example: 'count' })
  @IsOptional()
  @IsString()
  unit?: string;
}
