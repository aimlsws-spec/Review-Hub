import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveCampaignDto {
  @ApiPropertyOptional({ example: 'Meets all campaign guidelines' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectCampaignDto {
  @ApiProperty({ example: 'Reward amount exceeds the platform maximum for this category' })
  @IsString()
  @MinLength(5)
  reason!: string;
}

export class RequestCampaignChangesDto {
  @ApiProperty({ example: 'Please clarify the eligible countries before resubmitting' })
  @IsString()
  @MinLength(5)
  comments!: string;
}
