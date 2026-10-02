import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MobileSocialLoginDto {
  @ApiProperty({ description: 'The identity token from Google/Apple' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({ description: 'First name (from provider or user)' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (from provider or user)' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Client-reported: whether the device is rooted/jailbroken' })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;

  @ApiPropertyOptional({ description: 'Client-reported: whether the app is running on an emulator/simulator' })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;

  @ApiPropertyOptional({ description: 'Client-reported: whether an automation framework (Frida/Xposed) was detected' })
  @IsOptional()
  @IsBoolean()
  isAutomationDetected?: boolean;
}
