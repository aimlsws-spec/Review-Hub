import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

import { PHONE_PATTERN, PHONE_PATTERN_MESSAGE } from '../constants';

import { DemographicsDto } from './demographics.dto';

export class UpdateProfileDto extends DemographicsDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  /**
   * Contact number, saved as typed without an SMS code (SMS is not part of the product). An empty string removes it.
   */
  @ApiPropertyOptional({ example: '+919876543210', description: 'Empty string removes the number' })
  @IsOptional()
  @IsString()
  @ValidateIf((dto: UpdateProfileDto) => dto.phone !== '')
  @Matches(PHONE_PATTERN, { message: PHONE_PATTERN_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;
}
