import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UserKycUploadDto {
  @ApiProperty({ enum: UserDocumentType, example: 'PAN' })
  @IsEnum(UserDocumentType)
  documentType!: UserDocumentType;

  @ApiPropertyOptional({ example: 'AAAAA0000A' })
  @IsOptional()
  @IsString()
  documentNumber?: string;
}
