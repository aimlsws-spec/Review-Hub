import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectSubmissionDto {
  @ApiProperty({ example: 'Screenshot does not show the required follow action' })
  @IsString()
  @MinLength(5)
  rejectionReason!: string;
}
