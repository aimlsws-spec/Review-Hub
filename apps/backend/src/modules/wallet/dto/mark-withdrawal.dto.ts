import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { BANK_REFERENCE_MESSAGE, BANK_REFERENCE_PATTERN } from '@common/utils';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** An admin recording that they sent a withdrawal's money by bank transfer. */
export class MarkWithdrawalPaidDto {
  @ApiProperty({ example: 'UTR123456789012', description: "The bank's reference for the transfer. Each reference can be used once." })
  @Transform(trim)
  @IsString()
  @Matches(BANK_REFERENCE_PATTERN, { message: `reference ${BANK_REFERENCE_MESSAGE}` })
  reference!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** An admin recording that the money could not be sent, so it goes back to the user. */
export class MarkWithdrawalFailedDto {
  @ApiProperty({ example: 'Account number rejected by the bank', description: 'Shown to the user' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
