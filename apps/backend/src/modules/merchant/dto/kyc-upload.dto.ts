import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class KycUploadDto {
  @ApiProperty({ enum: MerchantDocumentType, example: 'GST' })
  @IsEnum(MerchantDocumentType)
  documentType!: MerchantDocumentType;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ description: 'File to upload (multipart)' })
  file!: Express.Multer.File;
}

export class KycResubmitDto {
  @ApiProperty({ enum: MerchantDocumentType, example: 'GST' })
  @IsEnum(MerchantDocumentType)
  documentType!: MerchantDocumentType;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  documentNumber?: string;
}
