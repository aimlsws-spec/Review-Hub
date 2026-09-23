import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';
import { CampaignSort } from '@common/enums';

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

  @ApiPropertyOptional({ enum: CampaignSort, default: CampaignSort.Featured })
  @IsOptional()
  @IsEnum(CampaignSort)
  sort: CampaignSort = CampaignSort.Featured;

  @ApiPropertyOptional({ description: 'Required with sort=nearest — the device\'s current position', example: 12.9716 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Required with sort=nearest — the device\'s current position', example: 77.5946 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
