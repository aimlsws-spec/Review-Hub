import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { DocumentVerificationStatus } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { USER_DOCUMENT_STORAGE } from '../constants';
import { UserKycUploadDto } from '../dto';
import { UserKycDocumentRepository } from '../repositories';

@Injectable()
export class UserKycService {
  constructor(
    private readonly documentRepository: UserKycDocumentRepository,
    private readonly storageService: LocalStorageService,
  ) {}

  async uploadDocument(userId: string, dto: UserKycUploadDto, file: Express.Multer.File) {
    const allowedMimeTypes: readonly string[] = USER_DOCUMENT_STORAGE.ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP, PDF');
    }

    if (file.size > USER_DOCUMENT_STORAGE.MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum 10MB');
    }

    const existingDoc = await this.documentRepository.findByUserAndType(userId, dto.documentType);
    if (existingDoc?.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Document already verified');
    }

    const uploadResult = await this.storageService.saveFile(file.buffer, file.originalname, `user/${userId}/documents`);

    const document = await this.documentRepository.create({
      user: { connect: { id: userId } },
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      fileUploadId: uploadResult.path,
      verificationStatus: 'PENDING' as DocumentVerificationStatus,
    });

    if (existingDoc && existingDoc.verificationStatus === 'REJECTED') {
      await this.documentRepository.softDelete(existingDoc.id);
    }

    return document;
  }

  async getDocuments(userId: string) {
    return this.documentRepository.findByUserId(userId);
  }

  /** PAN is the specific document withdrawals gate on — matches the product's own "PAN verification (before withdrawals)" requirement. */
  async isPanVerified(userId: string): Promise<boolean> {
    const pan = await this.documentRepository.findByUserAndType(userId, 'PAN');
    return pan?.verificationStatus === 'APPROVED';
  }

  /**
   * Resolves a KYC document to an absolute path on disk for streaming back to
   * an authorized caller (the document's owner). These files are deliberately
   * kept off ServeStaticModule — see app.module.ts — so this is the only way
   * to actually read one.
   */
  async getDocumentFilePath(userId: string, documentId: string): Promise<string> {
    const document = await this.documentRepository.findById(documentId);
    // A document belonging to a different user is reported as not found, not
    // forbidden, so ids can't be used to probe for other users' documents.
    if (!document || document.userId !== userId || document.deletedAt || !document.fileUploadId) {
      throw new NotFoundException('Document');
    }

    const exists = await this.storageService.fileExists(document.fileUploadId);
    if (!exists) throw new NotFoundException('Document file');

    // storage.localPath is configured relative to cwd (e.g. "./uploads"), but
    // Express's res.sendFile() requires an absolute path or it throws.
    return path.resolve(this.storageService.getFilePath(document.fileUploadId));
  }
}
