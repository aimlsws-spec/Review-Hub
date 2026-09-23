import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCityDto {
  @ApiProperty({ description: 'The state this city belongs to' })
  @IsUUID()
  stateId!: string;

  @ApiProperty({ example: 'Coimbatore' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name!: string;
}

export class UpdateCityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ description: 'Switches the city off the sign-up picker without deleting it' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stateId?: string;

  @ApiPropertyOptional({ default: false, description: 'Also return cities switched off the picker' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean;
}
