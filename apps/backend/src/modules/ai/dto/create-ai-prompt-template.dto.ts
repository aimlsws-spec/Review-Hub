import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAiPromptTemplateDto {
  @ApiProperty({ example: 'submission-fraud-check' })
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ default: '1.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
