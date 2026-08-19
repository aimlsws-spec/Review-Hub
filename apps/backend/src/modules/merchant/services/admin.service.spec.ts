import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantDocumentRepository, MerchantRepository } from '../repositories';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockMerchantRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    findPending: jest.fn(),
    findWithFilters: jest.fn(),
  };
  const mockDocumentRepository = { findByMerchantId: jest.fn() };
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
      mockMerchantRepository.update.mockResolvedValue({ ...merchant, status: 'ACTIVE' });

      const result = await service.approveMerchant({ merchantId: 'merchant-1' }, 'admin-1');

      expect(result).toHaveProperty('status', 'ACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.approved', expect.any(Object));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', entity: 'Merchant' }),
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
      mockMerchantRepository.update.mockResolvedValue({ ...merchant, status: 'SUSPENDED' });

      const result = await service.rejectMerchant({ merchantId: 'merchant-1', reason: 'Invalid docs' }, 'admin-1');

      expect(result).toHaveProperty('status', 'SUSPENDED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.rejected', expect.any(Object));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'REJECT', entity: 'Merchant' }),
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

    it('should throw NotFoundException for an unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.getMerchantDetail('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
