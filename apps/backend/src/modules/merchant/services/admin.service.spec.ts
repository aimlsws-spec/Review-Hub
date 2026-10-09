import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantBankRepository, MerchantDocumentRepository, MerchantRepository } from '../repositories';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockMerchantRepository = {
    findVerificationFacts: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    approveWithDetails: jest.fn(),
    rejectWithDocuments: jest.fn(),
    findPending: jest.fn(),
    findWithFilters: jest.fn(),
  };
  const mockDocumentRepository = { findByMerchantId: jest.fn() };
  const mockBankRepository = { findByMerchantId: jest.fn().mockResolvedValue([]), findByMerchantIdRevealed: jest.fn().mockResolvedValue([]) };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  const merchant = {
    id: 'merchant-1',
    businessName: 'Acme',
    email: 'acme@example.com',
    status: 'PENDING_APPROVAL',
    verificationStatus: 'PENDING',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantDocumentRepository, useValue: mockDocumentRepository },
        { provide: MerchantBankRepository, useValue: mockBankRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('approveMerchant', () => {
    it('should activate and verify the merchant, emit an event, and audit it', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockMerchantRepository.approveWithDetails.mockResolvedValue({
        merchant: { ...merchant, status: 'ACTIVE' },
        documentsApproved: 1,
        bankAccountsVerified: 1,
      });

      const result = await service.approveMerchant({ merchantId: 'merchant-1' }, 'admin-1');

      expect(result).toHaveProperty('status', 'ACTIVE');
      expect(mockMerchantRepository.approveWithDetails).toHaveBeenCalledWith('merchant-1', 'admin-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.approved', expect.any(Object));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorType: 'ADMIN',
          action: 'APPROVE',
          entity: 'Merchant',
          after: expect.objectContaining({ documentsApproved: 1, bankAccountsVerified: 1 }),
        }),
      );
    });

    it('should throw NotFoundException for an unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.approveMerchant({ merchantId: 'unknown' }, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectMerchant', () => {
    it('should suspend the merchant, emit an event, and audit it', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockMerchantRepository.rejectWithDocuments.mockResolvedValue({
        merchant: { ...merchant, status: 'SUSPENDED' },
        documentsRejected: 2,
      });

      const result = await service.rejectMerchant({ merchantId: 'merchant-1', reason: 'Invalid docs' }, 'admin-1');

      expect(result).toHaveProperty('status', 'SUSPENDED');
      expect(mockMerchantRepository.rejectWithDocuments).toHaveBeenCalledWith('merchant-1', 'Invalid docs');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.rejected', expect.any(Object));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'REJECT',
          entity: 'Merchant',
          after: expect.objectContaining({ documentsRejected: 2 }),
        }),
      );
    });
  });

  describe('toggleMerchantStatus', () => {
    it('should update the merchant status and audit it', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockMerchantRepository.update.mockResolvedValue({ ...merchant, status: 'SUSPENDED' });

      const result = await service.toggleMerchantStatus('merchant-1', 'SUSPENDED' as never, 'admin-1');

      expect(result).toHaveProperty('status', 'SUSPENDED');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'STATUS_CHANGE', entity: 'Merchant' }),
      );
    });

    it('should throw NotFoundException for an unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.toggleMerchantStatus('unknown', 'SUSPENDED' as never, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMerchantDetail', () => {
    it('should attach documents to the merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockDocumentRepository.findByMerchantId.mockResolvedValue([{ id: 'doc-1' }]);

      const result = await service.getMerchantDetail('merchant-1');
      expect(result.documents).toHaveLength(1);
    });

    it('shows the verification level to the admin', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockDocumentRepository.findByMerchantId.mockResolvedValue([]);
      mockMerchantRepository.findVerificationFacts.mockResolvedValueOnce({ phoneVerified: true, emailVerified: false, businessVerified: true, premium: false });

      await expect(service.getMerchantDetail('merchant-1')).resolves.toEqual(expect.objectContaining({ verificationLevel: 1 }));
    });

    it('shows the admin the real bank account numbers, to check against the documents', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockDocumentRepository.findByMerchantId.mockResolvedValue([]);
      mockBankRepository.findByMerchantIdRevealed.mockResolvedValue([{ id: 'bank-1', accountNumber: '123456789012' }]);

      const result = await service.getMerchantDetail('merchant-1');

      expect(result.bankAccounts).toEqual([{ id: 'bank-1', accountNumber: '123456789012' }]);
      expect(mockBankRepository.findByMerchantId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.getMerchantDetail('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
