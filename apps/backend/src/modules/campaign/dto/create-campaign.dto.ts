import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignPriority, CampaignType, CampaignVisibility, RewardType, TargetGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ENABLED_CAMPAIGN_TYPES } from '../constants/enabled-types.constants';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Try our new summer menu' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Visit our restaurant and share your honest experience' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @ApiProperty({ example: 'Full campaign brief describing what participants should do...' })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ enum: ENABLED_CAMPAIGN_TYPES, example: CampaignType.REVIEW })
  @IsIn(ENABLED_CAMPAIGN_TYPES, { message: `campaignType must be one of: ${ENABLED_CAMPAIGN_TYPES.join(', ')}` })
  campaignType!: CampaignType;

  @ApiPropertyOptional({ enum: CampaignVisibility, default: CampaignVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(CampaignVisibility)
  visibility?: CampaignVisibility;

  @ApiPropertyOptional({ enum: CampaignPriority, default: CampaignPriority.NORMAL })
  @IsOptional()
  @IsEnum(CampaignPriority)
  priority?: CampaignPriority;

  /**
   * Kept so clients that still send CASH keep working. Every reward is money credited to the user's wallet: the other
   * RewardType values (points, coupons, gift cards...) were never paid out as anything but cash, so they are refused.
   */
  @ApiPropertyOptional({ enum: [RewardType.CASH], default: RewardType.CASH, description: 'Always CASH: rewards are paid into the user\'s wallet' })
  @IsOptional()
  @IsIn([RewardType.CASH], { message: 'Rewards are always paid as money into the user\'s wallet, so rewardType can only be CASH' })
  rewardType?: RewardType;

  @ApiProperty({ example: 50, description: 'Reward per participant, in rupees' })
  @IsNumber()
  @Min(1)
  rewardAmount!: number;

  @ApiProperty({ example: 5000, description: 'Total campaign budget, in rupees' })
  @IsNumber()
  @Min(1)
  totalBudget!: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumUserLevel?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumFollowers?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(13)
  minimumAge?: number;

  @ApiPropertyOptional({ example: 65 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(120)
  maximumAge?: number;

  @ApiPropertyOptional({ enum: TargetGender, default: TargetGender.ALL })
  @IsOptional()
  @IsEnum(TargetGender)
  targetGender?: TargetGender;

  @ApiPropertyOptional({ type: [String], example: ['uuid-of-country'] })
  @IsOptional()
  @IsArray()
  targetCountries?: string[];

  @ApiPropertyOptional({ type: [String], example: ['uuid-of-state'] })
  @IsOptional()
  @IsArray()
  targetStates?: string[];

  @ApiPropertyOptional({ type: [String], example: ['uuid-of-city'] })
  @IsOptional()
  @IsArray()
  targetCities?: string[];

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-09-08T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Currently ignored: every campaign is reviewed by an admin before it can go live.',
  })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({ default: 0.8, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiThreshold?: number;
}
