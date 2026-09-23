import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['UPHELD', 'REVERSED'], description: 'The decision on the dispute' })
  @IsEnum(['UPHELD', 'REVERSED'])
  @IsNotEmpty()
  decision!: 'UPHELD' | 'REVERSED';

  @ApiPropertyOptional({ description: 'Internal admin notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
