import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class TaskIssueDto {
  @ApiProperty({ example: 'The provided app link is broken.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ description: "One of the caller's own submissions for this task, when the issue is about it" })
  @IsOptional()
  @IsUUID()
  submissionId?: string;
}
