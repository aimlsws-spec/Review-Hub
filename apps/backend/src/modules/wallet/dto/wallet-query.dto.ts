import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { RewardStatus, WalletTransactionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

/** What a person can narrow their wallet history by. Dates are India days, "2026-09-21". */
export class WalletTransactionFilterDto {
  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'First day to include (India time)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must look like 2026-09-01' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Last day to include (India time)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must look like 2026-09-30' })
  to?: string;

  @ApiPropertyOptional({ description: 'Words in the note on the transaction' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  search?: string;
}

export class WalletTransactionQueryDto extends IntersectionType(PaginationQueryDto, WalletTransactionFilterDto) {}

/** A statement download has no pages: it is the whole filtered history, up to a limit. */
export class WalletTransactionExportQueryDto extends WalletTransactionFilterDto {}

export class RewardQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RewardStatus })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}
