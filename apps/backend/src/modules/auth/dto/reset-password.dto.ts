import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE, PASSWORD_POLICY } from '../constants';

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

  @ApiProperty({ example: 'NewPassw0rd!23' })
  @IsString()
  @MinLength(PASSWORD_POLICY.MIN_LENGTH)
  @MaxLength(PASSWORD_POLICY.MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password!: string;
}
