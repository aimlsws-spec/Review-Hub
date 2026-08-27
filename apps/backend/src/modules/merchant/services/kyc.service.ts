import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentVerificationStatus, MerchantVerificationStatus } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { DOCUMENT_STORAGE } from '../constants';
import { KycResubmitDto, KycUploadDto } from '../dto';
import { MerchantKycUploadedEvent } from '../events';
import { MerchantDocumentRepository, MerchantRepository } from '../repositories';

@Injectable()
export class KycService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly documentRepository: MerchantDocumentRepository,
    private readonly storageService: LocalStorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async uploadDocument(merchantId: string, dto: KycUploadDto, file: Express.Multer.File) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const allowedMimeTypes: readonly string[] = DOCUMENT_STORAGE.ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP, PDF');
    }

    if (file.size > DOCUMENT_STORAGE.MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Maximum 10MB');
    }

    const existingDoc = await this.documentRepository.findByMerchantAndType(merchantId, dto.documentType);
    if (existingDoc?.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Document already verified');
    }

    const uploadResult = await this.storageService.saveFile(file.buffer, file.originalname, `merchant/${merchantId}/documents`);

    const document = await this.documentRepository.create({
      merchant: { connect: { id: merchantId } },
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      fileUploadId: uploadResult.path,
      verificationStatus: 'PENDING' as DocumentVerificationStatus,
    });

    if (existingDoc && existingDoc.verificationStatus === 'REJECTED') {
      await this.documentRepository.softDelete(existingDoc.id);
    }

    await this.merchantRepository.update(merchantId, {
      verificationStatus: 'PENDING' as MerchantVerificationStatus,
    });

    this.eventEmitter.emit('merchant.kyc.uploaded', new MerchantKycUploadedEvent(
      merchantId, dto.documentType,
    ));

    return document;
  }

  async resubmitDocument(merchantId: string, dto: KycResubmitDto, file: Express.Multer.File) {
    return this.uploadDocument(merchantId, { ...dto, file }, file);
  }

  async getDocuments(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    return this.documentRepository.findByMerchantId(merchantId);
  }

  /**
   * Resolves a KYC document to an absolute path on disk for streaming back to
   * an authorized caller (the merchant themselves, or an admin reviewing them).
   * These files are deliberately kept off ServeStaticModule — see app.module.ts —
   * so this is the only way to actually read one.
   */
  async getDocumentFilePath(merchantId: string, documentId: string): Promise<string> {
    const document = await this.documentRepository.findById(documentId);
    // A document belonging to a different merchant is reported as not found, not
    // forbidden, so ids can't be used to probe for other merchants' documents.
    if (!document || document.merchantId !== merchantId || document.deletedAt || !document.fileUploadId) {
      throw new NotFoundException('Document');
    }

    const exists = await this.storageService.fileExists(document.fileUploadId);
    if (!exists) throw new NotFoundException('Document file');

    // storage.localPath is configured relative to cwd (e.g. "./uploads"), but
    // Express's res.sendFile() requires an absolute path or it throws.
    return path.resolve(this.storageService.getFilePath(document.fileUploadId));
  }
}
