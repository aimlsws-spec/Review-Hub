import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { TrimString } from '@common/transformers';

import { IsBankAccountNumber, IsIFSC, IsUpiId } from '../validators';

/** Every text field is trimmed first: a pasted name with a stray tab or space would otherwise be stored as typed. */
export class AddBankDto {
  @ApiProperty({ example: 'HDFC Bank' })
  @TrimString
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankName!: string;

  @ApiProperty({ example: 'John Doe' })
  @TrimString
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  accountHolderName!: string;

  @ApiProperty({ example: '12345678901' })
  @TrimString
  @IsString()
  @IsBankAccountNumber()
  accountNumber!: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @TrimString
  @IsString()
  @IsIFSC()
  ifscCode!: string;

  @ApiPropertyOptional({ example: 'Mumbai Main Branch' })
  @IsOptional()
  @TrimString
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 'john@upi' })
  @IsOptional()
  @TrimString
  @IsString()
  @IsUpiId()
  upiId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateBankDto {
  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @TrimString
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @TrimString
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @TrimString
  @IsString()
  @IsIFSC()
  ifscCode?: string;

  @ApiPropertyOptional({ example: 'Mumbai Main Branch' })
  @IsOptional()
  @TrimString
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 'john@upi' })
  @IsOptional()
  @TrimString
  @IsString()
  @IsUpiId()
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
