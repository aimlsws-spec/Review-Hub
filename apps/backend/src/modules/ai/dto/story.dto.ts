import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ComposeStoryDto {
  @ApiProperty({ description: 'Campaign title' })
  @IsString()
  @IsNotEmpty()
  campaignTitle!: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  campaignDescription?: string;
}
