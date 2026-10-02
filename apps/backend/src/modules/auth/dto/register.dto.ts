import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE, PASSWORD_POLICY } from '../constants';

import { DemographicsDto } from './demographics.dto';

export class RegisterDto extends DemographicsDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Phone must be in international format (e.g. +919876543210)' })
  phone?: string;

  @ApiProperty({ example: 'Passw0rd!23' })
  @IsString()
  @MinLength(PASSWORD_POLICY.MIN_LENGTH)
  @MaxLength(PASSWORD_POLICY.MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password!: string;

  @ApiProperty({
    example: true,
    description: 'Must be true: the person accepts the Terms & Conditions, Privacy Policy and Reward Policy currently in force (FR-008)',
  })
  @Equals(true, { message: 'You must accept the Terms & Conditions, Privacy Policy and Reward Policy to create an account' })
  acceptPolicies!: boolean;

  @ApiPropertyOptional({ example: 'a1b2c3d4', description: "Another user's referral code, if you were invited" })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Client-reported: whether the device is rooted/jailbroken (mobile apps only — a server cannot detect this reliably)' })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;

  @ApiPropertyOptional({ description: 'Client-reported: whether the app is running on an emulator/simulator (mobile apps only)' })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;

  @IsOptional()
  @IsBoolean()
  isAutomationDetected?: boolean;
}
