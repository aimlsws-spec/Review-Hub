import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

import { IsBusinessUrl } from '../validators';

export class UpdateMerchantDto {
  @ApiPropertyOptional({ example: 'Acme Corp Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessName?: string;

  @ApiPropertyOptional({ example: 'We are a technology company...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://www.acme.com' })
  @IsOptional()
  @IsString()
  @IsBusinessUrl()
  website?: string;

  @ApiPropertyOptional({ example: '123 Business Park' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Suite 100' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'uuid-of-country' })
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-state' })
  @IsOptional()
  @IsString()
  stateId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-city' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  /**
   * Where the store is, so the app can sort campaigns by distance ("Nearest"). Both or neither: null for both clears
   * it. A business with no location still shows, after those that have one.
   */
  @ApiPropertyOptional({ example: 23.0225, nullable: true, description: 'Store latitude; send with longitude, or null to clear' })
  @ValidateIf((dto: UpdateMerchantDto) => dto.latitude !== null && dto.latitude !== undefined)
  @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 72.5714, nullable: true, description: 'Store longitude; send with latitude, or null to clear' })
  @ValidateIf((dto: UpdateMerchantDto) => dto.longitude !== null && dto.longitude !== undefined)
  @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  longitude?: number | null;
}
