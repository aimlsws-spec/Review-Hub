import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { PASSWORD_POLICY, PHONE_PATTERN, PHONE_PATTERN_MESSAGE } from '../constants';
import { IsPolicyPassword } from '../validators';

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

  /** Required: codes (verification, sign-in checks, password reset) go by email; SMS is not part of the product. */
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  /** Optional contact number. Never verified by SMS. */
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_PATTERN_MESSAGE })
  phone?: string;

  @ApiProperty({ example: 'Passw0rd!23', minLength: PASSWORD_POLICY.MIN_LENGTH, maxLength: PASSWORD_POLICY.MAX_LENGTH })
  @IsString()
  @IsPolicyPassword()
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
