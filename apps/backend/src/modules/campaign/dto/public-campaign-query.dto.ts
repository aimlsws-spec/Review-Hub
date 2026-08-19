import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class PublicCampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaignType?: CampaignType;

  @ApiPropertyOptional({ example: 'summer menu' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
