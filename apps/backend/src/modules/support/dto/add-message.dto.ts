import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AddMessageDto {
  @ApiProperty({ example: 'Could you share the withdrawal request ID so we can look into it?' })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiPropertyOptional({ default: false, description: 'Staff-only note not visible to the ticket owner' })
  @IsOptional()
  @IsBoolean()
  internalNote?: boolean;
}
