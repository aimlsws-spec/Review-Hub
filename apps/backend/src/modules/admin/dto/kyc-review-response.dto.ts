import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentVerificationStatus, UserDocumentType } from '@prisma/client';

export class KycReviewUserDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Priya Sharma' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
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
}
