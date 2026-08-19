import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus, CampaignType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class CampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaignType?: CampaignType;
}
