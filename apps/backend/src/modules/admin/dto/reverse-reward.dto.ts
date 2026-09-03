import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReverseRewardDto {
  @ApiProperty({ example: 'Confirmed duplicate screenshot across 6 accounts on the same device.' })
  @IsString()
  @MinLength(10)
  reason!: string;
}
