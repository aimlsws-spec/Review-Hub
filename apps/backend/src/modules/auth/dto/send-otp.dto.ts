import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ enum: OtpType, example: 'REGISTRATION' })
  @IsEnum(OtpType)
  type!: OtpType;
}
