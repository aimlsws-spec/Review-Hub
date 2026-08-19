import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({ example: 'uuid-of-admin-user' })
  @IsString()
  assignedToId!: string;
}
