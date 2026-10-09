import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export const JOINED_CAMPAIGN_FILTERS = ['IN_PROGRESS', 'COMPLETED'] as const;
export type JoinedCampaignFilter = (typeof JOINED_CAMPAIGN_FILTERS)[number];

/** Which of a person's joined campaigns to list: the ones still under way, or the ones they have completed. */
export class JoinedCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JOINED_CAMPAIGN_FILTERS, default: 'COMPLETED' })
  @IsOptional()
  @IsIn(JOINED_CAMPAIGN_FILTERS)
  status: JoinedCampaignFilter = 'COMPLETED';
}
