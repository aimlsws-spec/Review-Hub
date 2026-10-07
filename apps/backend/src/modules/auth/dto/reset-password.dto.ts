import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

import { PASSWORD_POLICY } from '../constants';
import { IsPolicyPassword } from '../validators';

export class ResetPasswordDto {
  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NewPassw0rd!23', minLength: PASSWORD_POLICY.MIN_LENGTH, maxLength: PASSWORD_POLICY.MAX_LENGTH })
  @IsString()
  @IsPolicyPassword()
  password!: string;
}
