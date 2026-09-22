import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { BROADCAST_LIMITS } from '../constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * A reusable message. `title` and `body` may use {{firstName}}. `channel` is the channel the template
 * was written for, which a broadcast pre-selects; the admin can still change it when sending.
 */
export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'Happy hour', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Happy hour is on!', maxLength: BROADCAST_LIMITS.TITLE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.TITLE_MAX)
  title!: string;

  @ApiProperty({ example: 'Hi {{firstName}}, complete a task before 8 PM today.', maxLength: BROADCAST_LIMITS.MESSAGE_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.MESSAGE_MAX)
  body!: string;

  @ApiPropertyOptional({ description: 'Email subject; falls back to the title', maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  subject?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: 'IN_APP' })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Every field optional; only what is sent is changed. */
export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: BROADCAST_LIMITS.TITLE_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({ maxLength: BROADCAST_LIMITS.MESSAGE_MAX })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BROADCAST_LIMITS.MESSAGE_MAX)
  body?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  subject?: string;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
