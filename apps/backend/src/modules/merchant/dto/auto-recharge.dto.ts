import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, Min, ValidateIf } from 'class-validator';

import { MERCHANT_WALLET_CONSTANTS } from '../constants';

export class UpdateAutoRechargeSettingsDto {
  @ApiProperty({ example: true, description: 'Whether the wallet tops itself up automatically' })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ example: 500, description: 'Recharge triggers once availableBalance drops to or below this' })
  @ValidateIf((dto: UpdateAutoRechargeSettingsDto) => dto.enabled)
  @IsNumber()
  @Min(MERCHANT_WALLET_CONSTANTS.MIN_AUTO_RECHARGE_THRESHOLD)
  threshold?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Amount added each time auto-recharge triggers' })
  @ValidateIf((dto: UpdateAutoRechargeSettingsDto) => dto.enabled)
  @IsNumber()
  @Min(MERCHANT_WALLET_CONSTANTS.MIN_AUTO_RECHARGE_AMOUNT)
  amount?: number;
}
