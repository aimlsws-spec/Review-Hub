import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiPropertyOptional({ description: "The account's current password. Required when the account has one." })
  @IsOptional()
  @IsString()
  @MaxLength(72)
  currentPassword?: string;
}
