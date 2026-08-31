import * as path from 'path';

import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { UserKycDocumentRepository } from '../repositories';

import { UserKycService } from './user-kyc.service';

describe('UserKycService', () => {
  let service: UserKycService;

  const mockDocumentRepository = {
    findByUserAndType: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
  };

  const mockStorageService = {
    saveFile: jest.fn(),
    fileExists: jest.fn(),
    getFilePath: jest.fn(),
  };

  const mockFile = {
    mimetype: 'image/jpeg',
    size: 1024 * 500,
    originalname: 'pan-card.jpg',
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockDocument = {
    id: 'doc-1',
    userId: 'user-1',
    documentType: 'PAN',
    documentNumber: 'AAAAA0000A',
    fileUploadId: '/upload/user/user-1/documents/file.jpg',
    verificationStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserKycService,
        { provide: UserKycDocumentRepository, useValue: mockDocumentRepository },
        { provide: LocalStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserKycService>(UserKycService);
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const dto = { documentType: 'PAN' as const, documentNumber: 'AAAAA0000A' };

    it('should upload a document successfully', async () => {
      mockDocumentRepository.findByUserAndType.mockResolvedValue(null);
      mockStorageService.saveFile.mockResolvedValue({ path: '/upload/file.jpg', size: 500 });
      mockDocumentRepository.create.mockResolvedValue(mockDocument);

      const result = await service.uploadDocument('user-1', dto as never, mockFile);

      expect(result).toEqual(mockDocument);
      expect(mockStorageService.saveFile).toHaveBeenCalledWith(mockFile.buffer, mockFile.originalname, 'user/user-1/documents');
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const badFile = { ...mockFile, mimetype: 'image/gif' };

      await expect(service.uploadDocument('user-1', dto as never, badFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized file', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };

      await expect(service.uploadDocument('user-1', dto as never, largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if document already approved', async () => {
      mockDocumentRepository.findByUserAndType.mockResolvedValue({ ...mockDocument, verificationStatus: 'APPROVED' });

      await expect(service.uploadDocument('user-1', dto as never, mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should soft-delete a previously rejected document of the same type', async () => {
      mockDocumentRepository.findByUserAndType.mockResolvedValue({ ...mockDocument, id: 'doc-old', verificationStatus: 'REJECTED' });
      mockStorageService.saveFile.mockResolvedValue({ path: '/upload/file.jpg', size: 500 });
      mockDocumentRepository.create.mockResolvedValue(mockDocument);

      await service.uploadDocument('user-1', dto as never, mockFile);

      expect(mockDocumentRepository.softDelete).toHaveBeenCalledWith('doc-old');
    });
  });

  describe('getDocuments', () => {
    it('should return documents for the user', async () => {
      mockDocumentRepository.findByUserId.mockResolvedValue([mockDocument]);

      const result = await service.getDocuments('user-1');
      expect(result).toHaveLength(1);
      expect(mockDocumentRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getDocumentFilePath', () => {
    it('resolves an absolute path for an owned, existing document', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFilePath.mockReturnValue('uploads/user/user-1/documents/file.jpg');

      const result = await service.getDocumentFilePath('user-1', 'doc-1');

      expect(mockStorageService.fileExists).toHaveBeenCalledWith(mockDocument.fileUploadId);
      expect(result).toContain('uploads');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('throws NotFoundException for a document belonging to a different user', async () => {
      mockDocumentRepository.findById.mockResolvedValue({ ...mockDocument, userId: 'other-user' });

      await expect(service.getDocumentFilePath('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
      expect(mockStorageService.fileExists).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the document does not exist', async () => {
      mockDocumentRepository.findById.mockResolvedValue(null);

      await expect(service.getDocumentFilePath('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the file is missing from disk', async () => {
      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(service.getDocumentFilePath('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });
});
