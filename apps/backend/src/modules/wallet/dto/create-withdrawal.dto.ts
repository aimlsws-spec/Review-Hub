import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 1500, description: 'Amount in rupees, minimum ₹1,000' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'uuid-of-bank-account' })
  @IsString()
  bankAccountId!: string;
}
