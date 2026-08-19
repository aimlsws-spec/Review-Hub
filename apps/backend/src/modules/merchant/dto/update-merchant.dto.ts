import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
