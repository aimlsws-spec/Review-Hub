import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Pass@123' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ example: false, description: 'Extend refresh token expiry to 30 days' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiPropertyOptional({ description: 'Client-reported: whether the device is rooted/jailbroken (mobile apps only — a server cannot detect this reliably)' })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;

  @ApiPropertyOptional({ description: 'Client-reported: whether the app is running on an emulator/simulator (mobile apps only)' })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;
}
