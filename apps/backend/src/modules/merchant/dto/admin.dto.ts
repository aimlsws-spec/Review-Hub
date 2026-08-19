import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveMerchantDto {
  @ApiProperty({ example: 'uuid-of-merchant' })
  @IsString()
  merchantId!: string;
}

export class RejectMerchantDto {
  @ApiProperty({ example: 'uuid-of-merchant' })
  @IsString()
  merchantId!: string;

  @ApiProperty({ example: 'Business documents do not match registration records' })
  @IsString()
  @MinLength(10)
  reason!: string;
}

export class RequestDocumentsDto {
  @ApiProperty({ example: 'uuid-of-merchant' })
  @IsString()
  merchantId!: string;

  @ApiPropertyOptional({ example: 'Please upload a clearer copy of your PAN card' })
  @IsOptional()
  @IsString()
  message?: string;
}
