import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ example: 2500, description: 'Amount in rupees to cash out of the wallet balance' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'uuid-of-bank-account' })
  @IsString()
  bankAccountId!: string;

  @ApiPropertyOptional({ example: 'Unused budget from a cancelled campaign' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectRefundDto {
  @ApiProperty({ example: 'Bank account name does not match the business KYC document' })
  @IsString()
  @MinLength(5)
  rejectionReason!: string;
}
