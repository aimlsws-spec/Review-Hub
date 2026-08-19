import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportCategory, SupportPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Withdrawal stuck in PENDING for 3 days' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'I requested a withdrawal on Monday and it still shows PENDING...' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ enum: SupportCategory, default: SupportCategory.GENERAL })
  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;

  @ApiPropertyOptional({ enum: SupportPriority, default: SupportPriority.MEDIUM })
  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;
}
