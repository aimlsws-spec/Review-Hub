import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE, PASSWORD_POLICY } from '../constants';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass@123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassw0rd!45' })
  @IsString()
  @MinLength(PASSWORD_POLICY.MIN_LENGTH)
  @MaxLength(PASSWORD_POLICY.MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  newPassword!: string;
}
