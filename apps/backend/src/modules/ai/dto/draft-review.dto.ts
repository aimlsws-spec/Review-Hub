import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REVIEW_LIKED_ASPECTS = ['FOOD', 'STAFF', 'PRICE', 'CLEANLINESS', 'SERVICE'] as const;

export class DraftReviewDto {
  @ApiPropertyOptional({
    enum: REVIEW_LIKED_ASPECTS,
    isArray: true,
    description: 'What the reviewer actually said they liked — grounds the draft in their real answers.',
  })
  @IsOptional()
  @IsArray()
  @IsIn(REVIEW_LIKED_ASPECTS, { each: true })
  likedAspects?: (typeof REVIEW_LIKED_ASPECTS)[number][];

  @ApiPropertyOptional({ example: 'Will definitely come back for the weekend brunch.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
