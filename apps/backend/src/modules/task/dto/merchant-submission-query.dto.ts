import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { SubmissionQueryDto } from './submission-query.dto';

/** A merchant's submission list: by status (as for a participant's own list), and optionally one campaign. */
export class MerchantSubmissionQueryDto extends SubmissionQueryDto {
  @ApiPropertyOptional({ description: 'Only submissions to this campaign' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
