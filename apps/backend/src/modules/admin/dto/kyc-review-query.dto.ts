import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentVerificationStatus, UserDocumentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@common/dto';

export class KycReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DocumentVerificationStatus, description: 'Omit to include every status' })
  @IsOptional()
  @IsEnum(DocumentVerificationStatus)
  status?: DocumentVerificationStatus;

  @ApiPropertyOptional({ enum: UserDocumentType })
  @IsOptional()
  @IsEnum(UserDocumentType)
  documentType?: UserDocumentType;

  @ApiPropertyOptional({ description: "Matches the user's name, email, phone or the document number", example: 'priya' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
