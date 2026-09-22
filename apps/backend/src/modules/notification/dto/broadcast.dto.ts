import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BroadcastStatus, NotificationType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

import { BROADCAST_LIMITS, BROADCAST_TYPES, SUPPORTED_CHANNELS } from '../constants';
import { BroadcastChannel } from '../interfaces';

import { AudienceFilterDto } from './audience-filter.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Request body for previewing how many users a set of filters would reach, before anything is sent. */
export class PreviewAudienceDto {
  // ValidateNested skips a missing value, so the audience must be required explicitly.
  @ApiProperty({ type: AudienceFilterDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audience!: AudienceFilterDto;
}

export class CreateBroadcastDto extends PreviewAudienceDto {
  @ApiProperty({ example: 'Happy hour is on!', maxLength: BROADCAST_LIMITS.TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.TITLE_MAX)
  title!: string;

  @ApiProperty({
    example: 'Hi {{firstName}}, complete a task before 8 PM today and check the app for bonus rewards.',
    maxLength: BROADCAST_LIMITS.MESSAGE_MAX,
    description: 'May use {{firstName}}',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.MESSAGE_MAX)
  message!: string;

  @ApiPropertyOptional({ enum: BROADCAST_TYPES, default: 'PROMOTIONAL' })
  @IsOptional()
  @IsIn(BROADCAST_TYPES)
  type?: (typeof BROADCAST_TYPES)[number];

  @ApiProperty({ enum: SUPPORTED_CHANNELS, isArray: true, example: ['IN_APP', 'PUSH'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(SUPPORTED_CHANNELS, { each: true })
  channels!: BroadcastChannel[];

  @ApiPropertyOptional({ description: 'When to send (ISO 8601). Omit to send immediately.', example: '2026-09-25T13:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      "Hold each person's message until the hour they are usually active (within 24 hours of the send time). Not available for SYSTEM announcements.",
  })
  @IsOptional()
  @IsBoolean()
  smartTiming?: boolean;
}

export class BroadcastQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BroadcastStatus })
  @IsOptional()
  @IsEnum(BroadcastStatus)
  status?: BroadcastStatus;
}

/** A broadcast as an admin sees it. */
export class BroadcastResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty({ enum: SUPPORTED_CHANNELS, isArray: true }) channels!: BroadcastChannel[];
  @ApiProperty({ type: AudienceFilterDto }) audience!: AudienceFilterDto;
  @ApiProperty({ enum: BroadcastStatus }) status!: BroadcastStatus;
  @ApiProperty() scheduledAt!: Date;
  @ApiPropertyOptional({ nullable: true }) startedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
  @ApiProperty({ description: 'Users queued so far; final once SENT' }) recipientCount!: number;
  @ApiProperty({ description: 'Each message is held until the hour that person is usually active' }) smartTiming!: boolean;
  @ApiPropertyOptional({ nullable: true }) failureReason!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ description: 'Admin who created it' }) createdBy!: { id: string; name: string };
}
