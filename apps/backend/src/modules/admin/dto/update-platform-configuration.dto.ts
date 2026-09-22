import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMode } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdatePlatformConfigurationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercentage?: number;

  @ApiPropertyOptional({ description: 'The least a user can withdraw at once, in rupees' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  minimumWithdrawal?: number;

  @ApiPropertyOptional({ description: 'The most a user can withdraw in one request, in rupees' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maximumWithdrawal?: number;

  @ApiPropertyOptional({ description: 'The most one user can withdraw in a calendar day (India time), in rupees' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  dailyWithdrawalLimit?: number;

  @ApiPropertyOptional({ nullable: true, description: 'The most one user can withdraw in a calendar month, in rupees. Send null for no monthly limit.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  monthlyWithdrawalLimit?: number | null;

  @ApiPropertyOptional({ description: 'Hours a new or changed bank account must wait before it can receive a withdrawal. 0 turns it off.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  bankCoolingHours?: number;

  @ApiPropertyOptional({ description: 'Tax kept back from user payouts, as a fraction: 0.1 is 10%. 0 keeps none back. Set only as advised by the tax adviser.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(0.5)
  tdsRate?: number;

  @ApiPropertyOptional({ description: "Tax is kept back once a user's payouts in a financial year (1 April to 31 March) go above this, in rupees." })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tdsAnnualThreshold?: number;

  @ApiPropertyOptional({ nullable: true, description: 'The income tax section the deduction is made under. Required before a rate can be set.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tdsSection?: string | null;

  @ApiPropertyOptional({ description: 'A bank-transfer top-up above this amount waits for a second admin before it is credited. 0 credits every top-up straight away.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  manualTopUpApprovalThreshold?: number;

  @ApiPropertyOptional({ enum: PayoutMode, description: 'GATEWAY pays approved withdrawals through the payment gateway; MANUAL leaves them for an admin to send and record.' })
  @IsOptional()
  @IsEnum(PayoutMode)
  payoutMode?: PayoutMode;

  @ApiPropertyOptional({ description: 'While on, everyone except administrators is turned away.' })
  // Not @IsOptional: that would also let null through. Left out is fine; anything sent must be a real true or false.
  @ValidateIf((_, value) => value !== undefined)
  // The global pipe turns any non-empty string, "false" included, into true. This switch locks everyone out, so it is
  // read exactly as sent and only a real true or false is accepted.
  @Transform(({ obj }: { obj: { maintenanceMode?: unknown } }) => obj.maintenanceMode)
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'What people see while maintenance is on. Empty uses a default message.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  maintenanceMessage?: string | null;

  @ApiPropertyOptional({ description: 'The oldest app version allowed to use the server, such as 1.4.0. Older apps are asked to update.' })
  @IsOptional()
  @Matches(/^\d{1,6}\.\d{1,6}\.\d{1,6}$/, { message: 'minimumAppVersion must look like 1.4.0' })
  minimumAppVersion?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Where the update prompt sends people, usually the store page.' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  updateUrl?: string | null;
}
