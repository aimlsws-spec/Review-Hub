import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectWithdrawalDto {
  @ApiProperty({ example: 'Bank account name does not match the KYC document' })
  @IsString()
  @MinLength(5)
  rejectionReason!: string;
}
