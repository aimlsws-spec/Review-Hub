import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REVIEW_LIKED_ASPECTS = ['FOOD', 'STAFF', 'PRICE', 'CLEANLINESS', 'SERVICE'] as const;

/** The same list, used for what could be better. Named separately so the two questions read the same everywhere. */
export const REVIEW_ASPECTS = REVIEW_LIKED_ASPECTS;

export type ReviewAspect = (typeof REVIEW_ASPECTS)[number];

/** How the person says the visit went overall. Their own word: it is never worked out from a star rating. */
export const REVIEW_EXPERIENCES = ['POSITIVE', 'MIXED', 'NEGATIVE'] as const;

export type ReviewExperience = (typeof REVIEW_EXPERIENCES)[number];

/** Turns "true"/"false" from a form or query into a boolean; leaves everything else for the validator to reject. */
const toBoolean = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

/**
 * What a person tells the review assistant about their own visit. Every question is optional and the assistant
 * writes only from what is answered: it never adds praise, complaints, or a recommendation the person did not give.
 */
export class DraftReviewDto {
  @ApiPropertyOptional({
    enum: REVIEW_ASPECTS,
    isArray: true,
    description: 'What the reviewer actually said they liked — grounds the draft in their real answers.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(REVIEW_ASPECTS.length)
  @IsIn(REVIEW_ASPECTS, { each: true })
  likedAspects?: ReviewAspect[];

  @ApiPropertyOptional({
    enum: REVIEW_ASPECTS,
    isArray: true,
    description: 'What the reviewer said could be better.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(REVIEW_ASPECTS.length)
  @IsIn(REVIEW_ASPECTS, { each: true })
  improveAspects?: ReviewAspect[];

  @ApiPropertyOptional({
    enum: REVIEW_EXPERIENCES,
    description: 'How the visit went overall. When left out, it follows what was listed above.',
  })
  @IsOptional()
  @IsIn(REVIEW_EXPERIENCES)
  experience?: ReviewExperience;

  @ApiPropertyOptional({
    description: 'Only send this when the person said whether they would recommend it. When left out, no draft says either way.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  wouldRecommend?: boolean;

  @ApiPropertyOptional({ example: 'The weekend brunch was good but the wait was long.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  notes?: string;
}
