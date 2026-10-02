import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RequestPhoneChangeDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Phone must be in international format (e.g. +919876543210)' })
  newPhone!: string;

  @ApiPropertyOptional({ description: "The account's current password. Required when the account has one." })
  @IsOptional()
  @IsString()
  @MaxLength(72)
  currentPassword?: string;
}

export class VerifyPhoneChangeDto {
  @ApiProperty({ example: '123456', description: 'The code sent by SMS to the new number' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
