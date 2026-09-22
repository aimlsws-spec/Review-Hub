import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';

/** Which country's states to list. Two letters, e.g. IN. */
export class StatesQueryDto {
  @ApiPropertyOptional({ example: 'IN', description: 'ISO country code. Defaults to India.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be a two-letter country code such as IN' })
  countryCode?: string;
}

export class StateResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Gujarat' }) name!: string;
  @ApiPropertyOptional({ example: 'GJ', nullable: true }) code!: string | null;
}

export class CityResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Ahmedabad' }) name!: string;
}
