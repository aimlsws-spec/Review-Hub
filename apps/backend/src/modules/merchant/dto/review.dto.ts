import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ReviewSource, ReviewStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class ReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReviewSource })
  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'highest', 'lowest'] })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'highest', 'lowest'])
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ enum: ReviewSource })
  @IsEnum(ReviewSource)
  source!: ReviewSource;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @ApiPropertyOptional({ description: 'When the review was originally posted, if different from now' })
  @IsOptional()
  @IsDateString()
  reviewedAt?: string;
}

export class ReplyReviewDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  reply!: string;
}

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}
