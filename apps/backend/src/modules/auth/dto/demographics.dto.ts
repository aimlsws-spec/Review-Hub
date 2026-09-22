import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { MIN_USER_AGE, USER_GENDERS, UserGender } from '../constants';
import { IsPlausibleBirthDate } from '../validators';

/**
 * Who a person is, so campaigns meant for a certain age, gender or place can find them. Every field is optional,
 * and `null` removes what was saved before. The country is never sent: it comes from the state, so the three can
 * never disagree.
 */
export class DemographicsDto {
  @ApiPropertyOptional({
    example: '1998-04-21',
    nullable: true,
    description: `YYYY-MM-DD. You must be at least ${MIN_USER_AGE}. Send null to remove it.`,
  })
  @IsOptional()
  @IsPlausibleBirthDate()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: USER_GENDERS, nullable: true })
  @IsOptional()
  @IsIn(USER_GENDERS)
  gender?: UserGender | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'From GET /locations/states' })
  @IsOptional()
  @IsUUID()
  stateId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'From GET /locations/states/:stateId/cities' })
  @IsOptional()
  @IsUUID()
  cityId?: string | null;
}
