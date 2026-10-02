import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';

import { GENERIC_OTP_TYPES, GenericOtpType } from '../constants';

export class VerifyOtpDto {
  @ApiProperty({ enum: GENERIC_OTP_TYPES, example: 'EMAIL_VERIFICATION' })
  @IsIn(GENERIC_OTP_TYPES)
  type!: GenericOtpType;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
