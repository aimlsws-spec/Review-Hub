import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportCategory, SupportPriority, SupportTicketStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class TicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportCategory })
  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;

  @ApiPropertyOptional({ enum: SupportPriority })
  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;
}
