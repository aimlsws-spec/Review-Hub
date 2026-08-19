import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateRechargeDto {
  @ApiProperty({ example: 5000, description: 'Amount to add to the wallet, in rupees' })
  @IsNumber()
  @Min(1)
  amount!: number;
}

export class VerifyRechargeDto {
  @ApiProperty()
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty()
  @IsString()
  razorpayPaymentId!: string;

  @ApiProperty()
  @IsString()
  razorpaySignature!: string;
}
