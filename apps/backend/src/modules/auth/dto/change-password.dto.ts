import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { PASSWORD_POLICY } from '../constants';
import { IsPolicyPassword } from '../validators';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass@123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassw0rd!45', minLength: PASSWORD_POLICY.MIN_LENGTH, maxLength: PASSWORD_POLICY.MAX_LENGTH })
  @IsString()
  @IsPolicyPassword()
  newPassword!: string;
}
