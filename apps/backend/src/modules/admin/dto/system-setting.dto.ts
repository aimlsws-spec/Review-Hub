import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { SettingDataType } from '@prisma/client';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSystemSettingDto {
  @ApiProperty({ example: 'withdrawal.min_amount' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 1000 })
  @IsDefined()
  value!: unknown;

  @ApiPropertyOptional({ enum: SettingDataType })
  @IsOptional()
  @IsEnum(SettingDataType)
  dataType?: SettingDataType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSystemSettingDto {
  @ApiProperty()
  @IsDefined()
  value!: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
