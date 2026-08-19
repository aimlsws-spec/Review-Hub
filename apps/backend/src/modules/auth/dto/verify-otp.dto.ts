import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ enum: OtpType, example: 'REGISTRATION' })
  @IsEnum(OtpType)
  type!: OtpType;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
