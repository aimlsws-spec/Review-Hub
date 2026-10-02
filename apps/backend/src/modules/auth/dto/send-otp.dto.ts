import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { GENERIC_OTP_TYPES, GenericOtpType } from '../constants';

export class SendOtpDto {
  @ApiProperty({ enum: GENERIC_OTP_TYPES, example: 'EMAIL_VERIFICATION' })
  @IsIn(GENERIC_OTP_TYPES)
  type!: GenericOtpType;
}
