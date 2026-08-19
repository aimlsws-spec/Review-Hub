import { ApiProperty } from '@nestjs/swagger';
import { SupportTicketStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;
}
