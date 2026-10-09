import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus, CampaignType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';
import { TrimString } from '@common/transformers';

/** Filters for the admin's list of every merchant's campaigns, in any status. */
export class AdminCampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaignType?: CampaignType;

  @ApiPropertyOptional({ description: 'Only this merchant\'s campaigns' })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({ example: 'summer menu', description: 'Matches the campaign title or the business name' })
  @IsOptional()
  @TrimString
  @IsString()
  @MaxLength(100)
  search?: string;
}
