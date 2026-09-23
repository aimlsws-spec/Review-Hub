import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @ApiProperty({ example: 'I completed the task correctly.', description: 'The reason for disputing the rejection' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
