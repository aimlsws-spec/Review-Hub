import { Test, TestingModule } from '@nestjs/testing';

import { AdminService, KycService, ManualTopUpService, RefundService } from '../services';

import { AdminMerchantController } from './admin.controller';

describe('AdminMerchantController', () => {
  let controller: AdminMerchantController;

  const mockAdminService = {
    listPendingMerchants: jest.fn(),
    listAllMerchants: jest.fn(),
    getMerchantDetail: jest.fn(),
    approveMerchant: jest.fn(),
    rejectMerchant: jest.fn(),
    requestDocuments: jest.fn(),
    toggleMerchantStatus: jest.fn(),
  };

  const mockKycService = {
    getDocumentFilePath: jest.fn(),
  };

  const mockRefundService = {
    listPendingForAdmin: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  const mockManualTopUpService = { record: jest.fn(), list: jest.fn(), listPendingApproval: jest.fn(), approve: jest.fn(), reject: jest.fn(), reverse: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMerchantController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: KycService, useValue: mockKycService },
        { provide: RefundService, useValue: mockRefundService },
        { provide: ManualTopUpService, useValue: mockManualTopUpService },
      ],
    }).compile();

    controller = module.get<AdminMerchantController>(AdminMerchantController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('manual top-ups', () => {
    it('records a top-up as the signed-in admin, from their address', async () => {
      const dto = { amount: 5000, bankReference: 'UTR123456', receivedOn: '2026-09-21' };
      mockManualTopUpService.record.mockResolvedValue({ id: 'topup-1' });

      const result = await controller.recordManualTopUp('merchant-1', 'admin-1', dto, { ip: '10.0.0.1' } as never);

      expect(mockManualTopUpService.record).toHaveBeenCalledWith('merchant-1', 'admin-1', dto, '10.0.0.1');
      expect(result).toEqual({ id: 'topup-1' });
    });

    it('lists a merchant’s top-ups with the page asked for', async () => {
      await controller.listManualTopUps('merchant-1', '2', '10');
      expect(mockManualTopUpService.list).toHaveBeenCalledWith('merchant-1', 2, 10);
    });

    it('is rate limited', () => {
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', AdminMerchantController.prototype.recordManualTopUp)).toBe(30);
    });

    it('lists the large top-ups waiting for a second admin', async () => {
      await controller.listPendingTopUps('2', '10');
      expect(mockManualTopUpService.listPendingApproval).toHaveBeenCalledWith(2, 10);
    });

    it('approves as the signed-in admin, from their address', async () => {
      await controller.approveTopUp('top-1', 'admin-2', { ip: '10.0.0.2' } as never);
      expect(mockManualTopUpService.approve).toHaveBeenCalledWith('top-1', 'admin-2', '10.0.0.2');
    });

    it('rejects and reverses with the reason given, as the signed-in admin', async () => {
      await controller.rejectTopUp('top-1', 'admin-2', { reason: 'Does not match the statement' }, { ip: '10.0.0.2' } as never);
      await controller.reverseTopUp('top-2', 'admin-3', { reason: 'Typed the wrong amount' }, { ip: '10.0.0.3' } as never);

      expect(mockManualTopUpService.reject).toHaveBeenCalledWith('top-1', 'admin-2', 'Does not match the statement', '10.0.0.2');
      expect(mockManualTopUpService.reverse).toHaveBeenCalledWith('top-2', 'admin-3', 'Typed the wrong amount', '10.0.0.3');
    });

    it.each(['approveTopUp', 'rejectTopUp', 'reverseTopUp'] as const)('%s is rate limited', (method) => {
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', AdminMerchantController.prototype[method])).toBe(30);
    });
  });

  describe('listPending', () => {
    it('should call adminService.listPendingMerchants', async () => {
      await controller.listPending();
      expect(mockAdminService.listPendingMerchants).toHaveBeenCalled();
    });
  });

  describe('listAll', () => {
    it('should call adminService.listAllMerchants with filters', async () => {
      await controller.listAll('1', '20', 'ACTIVE', 'test');
      expect(mockAdminService.listAllMerchants).toHaveBeenCalledWith(1, 20, 'ACTIVE', 'test');
    });
  });

  describe('approveMerchant', () => {
    it('should call adminService.approveMerchant', async () => {
      await controller.approveMerchant({ merchantId: 'merchant-1' }, 'admin-1');
      expect(mockAdminService.approveMerchant).toHaveBeenCalledWith({ merchantId: 'merchant-1' }, 'admin-1');
    });
  });

  describe('rejectMerchant', () => {
    it('should call adminService.rejectMerchant', async () => {
      await controller.rejectMerchant({ merchantId: 'merchant-1', reason: 'Invalid docs' }, 'admin-1');
      expect(mockAdminService.rejectMerchant).toHaveBeenCalledWith({ merchantId: 'merchant-1', reason: 'Invalid docs' }, 'admin-1');
    });
  });

  describe('getDocumentFile', () => {
    it('resolves the file path and streams it via res.sendFile', async () => {
      mockKycService.getDocumentFilePath.mockResolvedValue('/abs/uploads/merchant/merchant-1/documents/file.jpg');
      const mockRes = { sendFile: jest.fn() } as unknown as import('express').Response;

      await controller.getDocumentFile('merchant-1', 'doc-1', mockRes);

      expect(mockKycService.getDocumentFilePath).toHaveBeenCalledWith('merchant-1', 'doc-1');
      expect(mockRes.sendFile).toHaveBeenCalledWith('/abs/uploads/merchant/merchant-1/documents/file.jpg');
    });
  });

  describe('toggleStatus', () => {
    it('should call adminService.toggleMerchantStatus', async () => {
      await controller.toggleStatus('merchant-1', 'SUSPENDED', 'admin-1');
      expect(mockAdminService.toggleMerchantStatus).toHaveBeenCalledWith('merchant-1', 'SUSPENDED', 'admin-1');
    });
  });

  describe('listPendingRefunds', () => {
    it('should call refundService.listPendingForAdmin', async () => {
      await controller.listPendingRefunds('1', '20');
      expect(mockRefundService.listPendingForAdmin).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('approveRefund', () => {
    it('should call refundService.approve', async () => {
      await controller.approveRefund('refund-1', 'admin-1');
      expect(mockRefundService.approve).toHaveBeenCalledWith('refund-1', 'admin-1');
    });
  });

  describe('rejectRefund', () => {
    it('should call refundService.reject', async () => {
      await controller.rejectRefund('refund-1', 'admin-1', { rejectionReason: 'Bank mismatch' });
      expect(mockRefundService.reject).toHaveBeenCalledWith('refund-1', 'admin-1', { rejectionReason: 'Bank mismatch' });
    });
  });
});
