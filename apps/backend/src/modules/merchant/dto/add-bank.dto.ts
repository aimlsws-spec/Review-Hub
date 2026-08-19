import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { IsIFSC } from '../validators';

export class AddBankDto {
  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankName!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  accountHolderName!: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @MinLength(9)
  @MaxLength(18)
  accountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @IsString()
  @IsIFSC()
  ifscCode!: string;

  @ApiPropertyOptional({ example: 'Mumbai Main Branch' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 'john@upi' })
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateBankDto {
  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @IsIFSC()
  ifscCode?: string;

  @ApiPropertyOptional({ example: 'Mumbai Main Branch' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 'john@upi' })
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SetDefaultBankDto {
  @ApiProperty({ example: 'uuid-of-bank-account' })
  @IsString()
  bankId!: string;
}
