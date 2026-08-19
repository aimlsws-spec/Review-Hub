import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { IsGST, IsPAN, IsBusinessUrl } from '../validators';

export class RegisterMerchantDto {
  @ApiProperty({ example: 'Acme Corp Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName!: string;

  @ApiPropertyOptional({ example: 'Acme Corporation Private Limited' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalBusinessName?: string;

  @ApiPropertyOptional({ example: 'Private Limited' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  businessCategory?: string;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  @IsGST()
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'AAAAA0000A' })
  @IsOptional()
  @IsString()
  @IsPAN()
  panNumber?: string;

  @ApiPropertyOptional({ example: 'U72300MH2020PTC123456' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'https://www.acme.com' })
  @IsOptional()
  @IsString()
  @IsBusinessUrl()
  website?: string;

  @ApiProperty({ example: 'contact@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  phone!: string;

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

  @ApiPropertyOptional({ example: 'We are a technology company...' })
  @IsOptional()
  @IsString()
  description?: string;
}
