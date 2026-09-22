import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserKycReviewedEvent } from '../../user-kyc/events';
import { UserKycDocumentRepository } from '../../user-kyc/repositories';
import { UserKycService } from '../../user-kyc/services';
import { KycReviewQueryDto } from '../dto';

import { KycManagementService } from './kyc-management.service';

describe('KycManagementService', () => {
  let service: KycManagementService;

  const mockKycRepository = {
    findManyForReview: jest.fn(),
    countForReview: jest.fn(),
    findByIdForReview: jest.fn(),
    decideIfReviewable: jest.fn(),
  };
  const mockUserKycService = { getDocumentFilePathForReview: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  const pendingDocument = {
    id: 'doc-1',
    userId: 'user-1',
    documentType: 'PAN',
    documentNumber: 'ABCDE1234F',
    fileUploadId: '/user/user-1/documents/pan.jpg',
    verificationStatus: 'PENDING',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    deletedAt: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    user: { id: 'user-1', firstName: 'Priya', lastName: 'Sharma', email: 'priya@example.com', phone: '9876543210' },
  };

  const query = (overrides: Partial<KycReviewQueryDto> = {}) => Object.assign(new KycReviewQueryDto(), overrides);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycManagementService,
        { provide: UserKycDocumentRepository, useValue: mockKycRepository },
        { provide: UserKycService, useValue: mockUserKycService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<KycManagementService>(KycManagementService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    beforeEach(() => {
      mockKycRepository.findManyForReview.mockResolvedValue([pendingDocument]);
      mockKycRepository.countForReview.mockResolvedValue(1);
    });

    it('masks the document number and joins the user name in list rows', async () => {
      const result = await service.list(query({ status: 'PENDING' }));

      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'doc-1',
          documentNumber: '****234F',
          status: 'PENDING',
          hasFile: true,
          user: { id: 'user-1', name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210' },
        }),
      );
    });

    it('never leaks internal fields such as the raw storage path', async () => {
      const result = await service.list(query());
      expect(JSON.stringify(result)).not.toContain('pan.jpg');
      expect(result.data[0]).not.toHaveProperty('fileUploadId');
    });

    it('shows the oldest waiting document first when filtering to pending', async () => {
      await service.list(query({ status: 'PENDING' }));
      expect(mockKycRepository.findManyForReview).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });

    it('shows the newest first when looking at decided or all documents', async () => {
      await service.list(query());
      expect(mockKycRepository.findManyForReview).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('always excludes soft-deleted documents and applies status and type filters', async () => {
      await service.list(query({ status: 'REJECTED', documentType: 'PAN' }));
      expect(mockKycRepository.findManyForReview).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, verificationStatus: 'REJECTED', documentType: 'PAN' } }),
      );
    });

    it('searches the document number and the user name, email and phone', async () => {
      await service.list(query({ search: 'priya' }));

      const { where } = mockKycRepository.findManyForReview.mock.calls[0][0];
      expect(where.OR).toEqual([
        { documentNumber: { contains: 'priya' } },
        {
          user: {
            is: {
              OR: [
                { firstName: { contains: 'priya' } },
                { lastName: { contains: 'priya' } },
                { email: { contains: 'priya' } },
                { phone: { contains: 'priya' } },
              ],
            },
          },
        },
      ]);
    });

    it('paginates using the query skip and limit', async () => {
      await service.list(query({ page: 3, limit: 10 }));
      expect(mockKycRepository.findManyForReview).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
    });
  });

  describe('getById', () => {
    it('shows the full document number for the reviewer', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue(pendingDocument);
      const result = await service.getById('doc-1');
      expect(result.documentNumber).toBe('ABCDE1234F');
    });

    it('throws NotFoundException for an unknown or deleted document', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      mockKycRepository.findByIdForReview.mockResolvedValue(pendingDocument);
      mockKycRepository.decideIfReviewable.mockResolvedValue(true);
    });

    it('records the decision with the admin id, audits it and tells the user', async () => {
      await service.approve('doc-1', 'admin-1');

      expect(mockKycRepository.decideIfReviewable).toHaveBeenCalledWith('doc-1', {
        verificationStatus: 'APPROVED',
        verifiedBy: 'admin-1',
        verifiedAt: expect.any(Date),
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          entity: 'UserKycDocument',
          entityId: 'doc-1',
          action: 'APPROVE',
          before: { status: 'PENDING' },
          after: { status: 'APPROVED' },
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.kyc.approved', new UserKycReviewedEvent('user-1', 'doc-1', 'PAN'));
    });

    it.each(['APPROVED', 'REJECTED'])('refuses a document that is already %s', async (status) => {
      mockKycRepository.findByIdForReview.mockResolvedValue({ ...pendingDocument, verificationStatus: status });

      await expect(service.approve('doc-1', 'admin-1')).rejects.toThrow(BadRequestException);
      expect(mockKycRepository.decideIfReviewable).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('accepts a document that is under review', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue({ ...pendingDocument, verificationStatus: 'UNDER_REVIEW' });
      await expect(service.approve('doc-1', 'admin-1')).resolves.toBeDefined();
    });

    it('does not audit or notify when another admin decided at the same moment', async () => {
      mockKycRepository.decideIfReviewable.mockResolvedValue(false);

      await expect(service.approve('doc-1', 'admin-1')).rejects.toThrow(BadRequestException);
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown document', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue(null);
      await expect(service.approve('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    beforeEach(() => {
      mockKycRepository.findByIdForReview.mockResolvedValue(pendingDocument);
      mockKycRepository.decideIfReviewable.mockResolvedValue(true);
    });

    it('stores the reason, audits it and sends the reason to the user', async () => {
      await service.reject('doc-1', 'admin-1', 'Number does not match the document');

      expect(mockKycRepository.decideIfReviewable).toHaveBeenCalledWith('doc-1', {
        verificationStatus: 'REJECTED',
        verifiedBy: 'admin-1',
        verifiedAt: expect.any(Date),
        rejectionReason: 'Number does not match the document',
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REJECT',
          after: { status: 'REJECTED', reason: 'Number does not match the document' },
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.kyc.rejected',
        new UserKycReviewedEvent('user-1', 'doc-1', 'PAN', 'Number does not match the document'),
      );
    });

    it('refuses to overturn a decision that was already made', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue({ ...pendingDocument, verificationStatus: 'APPROVED' });

      await expect(service.reject('doc-1', 'admin-1', 'Changed my mind')).rejects.toThrow(BadRequestException);
      expect(mockKycRepository.decideIfReviewable).not.toHaveBeenCalled();
    });
  });

  describe('getFilePath', () => {
    it('resolves the file for an existing document', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue(pendingDocument);
      mockUserKycService.getDocumentFilePathForReview.mockResolvedValue('/abs/pan.jpg');

      await expect(service.getFilePath('doc-1', 'admin-1')).resolves.toBe('/abs/pan.jpg');
    });

    it('does not touch storage for an unknown document', async () => {
      mockKycRepository.findByIdForReview.mockResolvedValue(null);

      await expect(service.getFilePath('missing', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(mockUserKycService.getDocumentFilePathForReview).not.toHaveBeenCalled();
    });
  });
});
