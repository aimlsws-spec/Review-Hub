import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CMSPageStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class CreateCmsPageDto {
  @ApiProperty({ example: 'How rewards work' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'how-rewards-work' })
  @IsString()
  @MinLength(3)
  slug!: string;

  @ApiProperty({ example: '<p>Rewards are credited once...</p>' })
  @IsString()
  @MinLength(10)
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ enum: CMSPageStatus })
  @IsOptional()
  @IsEnum(CMSPageStatus)
  status?: CMSPageStatus;
}

export class UpdateCmsPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ enum: CMSPageStatus })
  @IsOptional()
  @IsEnum(CMSPageStatus)
  status?: CMSPageStatus;
}

export class CmsPageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CMSPageStatus })
  @IsOptional()
  @IsEnum(CMSPageStatus)
  status?: CMSPageStatus;
}

/** The slug in GET /pages/:slug. Pages are created with any slug of 3+ characters; only URL-safe ones are looked up. */
export class SlugParamDto {
  @ApiProperty({ example: 'terms-and-conditions' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,119}$/, { message: 'Invalid page slug' })
  slug!: string;
}
