import { Test, TestingModule } from '@nestjs/testing';

import { AdminService, KycService } from '../services';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMerchantController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: KycService, useValue: mockKycService },
      ],
    }).compile();

    controller = module.get<AdminMerchantController>(AdminMerchantController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
});
