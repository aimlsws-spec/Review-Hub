import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A plan as an admin creates it. Plans start switched off unless isActive is sent. */
export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'GROWTH', description: 'Capital letters, digits and underscores; never changes' })
  @Transform(trim)
  @Matches(/^[A-Z0-9_]{2,40}$/, { message: 'code must be 2–40 capital letters, digits or underscores' })
  code!: string;

  @ApiProperty({ example: 'Growth' })
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 999, description: 'Per month, in rupees, before GST' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  monthlyPrice!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Empty means no limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxActiveCampaigns?: number | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  featuredSlots?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Everything but the code can change. A price change applies from each subscriber's next renewal. */
export class UpdateSubscriptionPlanDto extends PartialType(OmitType(CreateSubscriptionPlanDto, ['code'] as const)) {}

export class SubscribeDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;
}
