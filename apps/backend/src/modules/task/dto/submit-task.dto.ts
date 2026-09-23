import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({ example: 'https://instagram.com/p/abc123' })
  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @ApiPropertyOptional({
    example: 'Great food, friendly staff, will come back again.',
    description: 'Also doubles as the scanned code for a QR_SCAN task.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textAnswer?: string;

  @ApiPropertyOptional({ description: 'The device\'s current position — required for a LOCATION_CHECKIN task.', example: 12.9716 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'The device\'s current position — required for a LOCATION_CHECKIN task.', example: 77.5946 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
