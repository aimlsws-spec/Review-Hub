import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({ example: 'https://instagram.com/p/abc123' })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiPropertyOptional({ example: 'Great food, friendly staff, will come back again.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textAnswer?: string;
}
