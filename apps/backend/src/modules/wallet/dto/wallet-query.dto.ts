import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardStatus, WalletTransactionType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class WalletTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;
}

export class RewardQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RewardStatus })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}
