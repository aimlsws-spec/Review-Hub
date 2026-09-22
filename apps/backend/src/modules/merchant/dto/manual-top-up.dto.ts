import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Max, Min, MinLength } from 'class-validator';

import { BANK_REFERENCE_MESSAGE, BANK_REFERENCE_PATTERN } from '@common/utils';

import { MANUAL_TOP_UP } from '../constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** An admin recording that a merchant's bank transfer arrived, so it can be added to their wallet. */
export class ManualTopUpDto {
  @ApiProperty({ example: 25000, description: 'The amount received in the platform bank account, in rupees' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MANUAL_TOP_UP.MIN_AMOUNT)
  @Max(MANUAL_TOP_UP.MAX_AMOUNT)
  amount!: number;

  @ApiProperty({ example: 'UTR123456789012', description: "The bank's reference for the transfer. Each reference can be used once." })
  @Transform(trim)
  @IsString()
  @Matches(BANK_REFERENCE_PATTERN, { message: `bankReference ${BANK_REFERENCE_MESSAGE}` })
  bankReference!: string;

  @ApiProperty({ example: '2026-09-21', description: 'The day the money reached the bank account' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'receivedOn must be a date like 2026-09-21' })
  receivedOn!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** An admin's reason for turning down or reversing a bank-transfer top-up. It is kept in the record. */
export class TopUpReasonDto {
  @ApiProperty({ example: 'The amount was typed wrongly', maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
