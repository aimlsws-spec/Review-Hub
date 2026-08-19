import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ example: 'Repeated policy violations' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  reason?: string;
}
