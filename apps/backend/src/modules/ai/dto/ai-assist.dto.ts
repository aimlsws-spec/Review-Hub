import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { DraftReviewDto } from './draft-review.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Text sent to the AI service ends up inside a language-model prompt, so every field has a hard length limit.
 * Without one, any signed-in user could send unlimited text into the model.
 */
const TITLE_MAX = 200;
const LONG_TEXT_MAX = 1000;

export class SuggestTextDto {
  @ApiProperty({ example: 'GOOGLE_REVIEW' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  taskType!: string;

  @ApiProperty({ example: 'Summer Launch', maxLength: TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  campaignTitle!: string;

  @ApiPropertyOptional({ maxLength: LONG_TEXT_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX)
  campaignDescription?: string;

  @ApiProperty({ example: 'Write a short review', maxLength: TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  taskTitle!: string;

  @ApiPropertyOptional({ maxLength: LONG_TEXT_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX)
  taskInstructions?: string;
}

/** The same answers as the task-scoped route, plus the business name, which there comes from the campaign. */
export class ReviewDraftsDto extends DraftReviewDto {
  @ApiProperty({ example: 'Cafe Blue', maxLength: TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  businessName!: string;
}

export class CaptionsDto {
  @ApiProperty({ example: 'Summer Launch', maxLength: TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  campaignTitle!: string;

  @ApiPropertyOptional({ maxLength: LONG_TEXT_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LONG_TEXT_MAX)
  campaignDescription?: string;
}
