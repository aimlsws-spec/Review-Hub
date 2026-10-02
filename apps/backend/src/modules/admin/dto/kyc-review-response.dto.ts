import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentVerificationStatus, UserDocumentType } from '@prisma/client';

export class KycReviewUserDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Priya Sharma' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
}

/** The automatic OCR comparison: flags only, never text read from the document. A hint, not a decision. */
export class KycOcrCheckDto {
  @ApiProperty({ enum: ['MATCH', 'PARTIAL', 'MISMATCH', 'UNREADABLE', 'UNAVAILABLE', 'NOT_AN_IMAGE'] }) status!: string;
  @ApiPropertyOptional({ nullable: true, description: 'Whether the typed document number was found on the image' }) numberMatches!: boolean | null;
  @ApiPropertyOptional({ nullable: true, description: 'Whether the account holder name was found on the image' }) nameMatches!: boolean | null;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence!: number;
}

/**
 * A KYC document as an admin sees it. `documentNumber` is masked in lists and shown in full only
 * on the single-document view, where the reviewer must compare it with the uploaded image.
 */
export class KycReviewItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: UserDocumentType }) documentType!: UserDocumentType;
  @ApiPropertyOptional({ nullable: true, example: '****234F' }) documentNumber!: string | null;
  @ApiProperty({ enum: DocumentVerificationStatus }) status!: DocumentVerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason!: string | null;
  @ApiProperty({ description: 'False when no file was uploaded, so there is nothing to view' }) hasFile!: boolean;
  @ApiProperty() submittedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) reviewedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, description: 'Id of the admin who decided' }) reviewedBy!: string | null;
  @ApiProperty({ type: KycReviewUserDto }) user!: KycReviewUserDto;
  @ApiPropertyOptional({ type: KycOcrCheckDto, nullable: true, description: 'Null until the automatic check has run' }) ocrCheck!: KycOcrCheckDto | null;
}
