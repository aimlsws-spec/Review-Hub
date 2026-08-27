import * as path from 'path';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { LocalStorageService } from '../../../storage/storage.service';
import { MerchantRepository, MerchantDocumentRepository } from '../repositories';

import { KycService } from './kyc.service';

describe('KycService', () => {
  let service: KycService;

  const mockMerchantRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockDocumentRepository = {
    findByMerchantAndType: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    findByMerchantId: jest.fn(),
    findById: jest.fn(),
  };

  const mockStorageService = {
    saveFile: jest.fn(),
    fileExists: jest.fn(),
    getFilePath: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockFile = {
    mimetype: 'image/jpeg',
    size: 1024 * 500,
    originalname: 'pan-card.jpg',
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-1',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
    verificationStatus: 'NOT_SUBMITTED',
  };

  const mockDocument = {
    id: 'doc-1',
    merchantId: 'merchant-1',
    documentType: 'PAN',
    documentNumber: 'AAAAA0000A',
    fileUploadId: '/upload/merchant/merchant-1/documents/file.jpg',
    verificationStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantDocumentRepository, useValue: mockDocumentRepository },
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const dto = { documentType: 'PAN' as const, documentNumber: 'AAAAA0000A' };

    it('should upload a document successfully', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockDocumentRepository.findByMerchantAndType.mockResolvedValue(null);
      mockStorageService.saveFile.mockResolvedValue({ path: '/upload/file.jpg', size: 500 });
      mockDocumentRepository.create.mockResolvedValue(mockDocument);

      const result = await service.uploadDocument('merchant-1', dto as never, mockFile);

      expect(result).toEqual(mockDocument);
      expect(mockStorageService.saveFile).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.kyc.uploaded', expect.any(Object));
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      const badFile = { ...mockFile, mimetype: 'image/gif' };

      await expect(service.uploadDocument('merchant-1', dto as never, badFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized file', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };

      await expect(service.uploadDocument('merchant-1', dto as never, largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if document already approved', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockDocumentRepository.findByMerchantAndType.mockResolvedValue({ ...mockDocument, verificationStatus: 'APPROVED' });

      await expect(service.uploadDocument('merchant-1', dto as never, mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.uploadDocument('unknown', dto as never, mockFile)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDocuments', () => {
    it('should return documents for merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockDocumentRepository.findByMerchantId.mockResolvedValue([mockDocument]);

      const result = await service.getDocuments('merchant-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDocumentFilePath', () => {
    it('resolves an absolute path for an owned, existing document', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFilePath.mockReturnValue('uploads/merchant/merchant-1/documents/file.jpg');

      const result = await service.getDocumentFilePath('merchant-1', 'doc-1');

      expect(mockStorageService.fileExists).toHaveBeenCalledWith(mockDocument.fileUploadId);
      expect(result).toContain('uploads');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('throws NotFoundException for a document belonging to a different merchant', async () => {
      mockDocumentRepository.findById.mockResolvedValue({ ...mockDocument, merchantId: 'other-merchant' });

      await expect(service.getDocumentFilePath('merchant-1', 'doc-1')).rejects.toThrow(NotFoundException);
      expect(mockStorageService.fileExists).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the document does not exist', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      await expect(service.getDocumentFilePath('merchant-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the file is missing from disk', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(service.getDocumentFilePath('merchant-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });
});
