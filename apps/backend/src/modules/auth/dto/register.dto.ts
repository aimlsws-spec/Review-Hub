import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
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

  @ApiProperty({ example: 'Pass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,72}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

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
}
