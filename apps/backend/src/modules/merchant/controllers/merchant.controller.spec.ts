import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../guards';
import { MerchantRepository, MerchantTeamRepository } from '../repositories';
import { MerchantService, KycService, TeamService, BankService, WalletService, DashboardService, RefundService } from '../services';

import { MerchantController } from './merchant.controller';

describe('MerchantController', () => {
  let controller: MerchantController;

  const mockMerchantService = {
    register: jest.fn(),
    getProfile: jest.fn(),
    getProfileByUserId: jest.fn(),
    updateProfile: jest.fn(),
    getVerificationStatus: jest.fn(),
  };

  const mockKycService = {
    uploadDocument: jest.fn(),
    resubmitDocument: jest.fn(),
    getDocuments: jest.fn(),
    getDocumentFilePath: jest.fn(),
  };

  const mockTeamService = {
    invite: jest.fn(),
    getTeamMembers: jest.fn(),
    updateTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
    getInvitations: jest.fn(),
    cancelInvitation: jest.fn(),
  };

  const mockBankService = {
    getBankAccounts: jest.fn(),
    addBankAccount: jest.fn(),
    updateBankAccount: jest.fn(),
    deleteBankAccount: jest.fn(),
    setDefaultBankAccount: jest.fn(),
  };

  const mockWalletService = {
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    createRechargeOrder: jest.fn(),
    verifyRecharge: jest.fn(),
  };

  const mockDashboardService = {
    getDashboard: jest.fn(),
  };

  const mockRefundService = {
    request: jest.fn(),
    listMine: jest.fn(),
    getMine: jest.fn(),
  };

  const mockMerchantRepository = {};
  const mockTeamRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantService },
        { provide: KycService, useValue: mockKycService },
        { provide: TeamService, useValue: mockTeamService },
        { provide: BankService, useValue: mockBankService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: RefundService, useValue: mockRefundService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
      ],
    }).compile();

    controller = module.get<MerchantController>(MerchantController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call merchantService.register', async () => {
      const dto = { businessName: 'Acme Corp', email: 'test@test.com', phone: '+911234567890' };
      await controller.register('user-1', dto as never);
      expect(mockMerchantService.register).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getMyMerchant', () => {
    it('should resolve the merchant from the user id, not a merchant id', async () => {
      await controller.getMyMerchant('user-1');
      expect(mockMerchantService.getProfileByUserId).toHaveBeenCalledWith('user-1');
      expect(mockMerchantService.getProfile).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should call merchantService.getProfile with merchantId', async () => {
      await controller.getProfile('merchant-1');
      expect(mockMerchantService.getProfile).toHaveBeenCalledWith('merchant-1');
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

  describe('getDashboard', () => {
    it('should call dashboardService.getDashboard', async () => {
      await controller.getDashboard('merchant-1');
      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith('merchant-1');
    });
  });

  describe('getWallet', () => {
    it('should call walletService.getWallet', async () => {
      await controller.getWallet('merchant-1');
      expect(mockWalletService.getWallet).toHaveBeenCalledWith('merchant-1');
    });
  });

  describe('getTransactions', () => {
    it('should call walletService.getTransactions with pagination', async () => {
      await controller.getTransactions('merchant-1', '1', '20');
      expect(mockWalletService.getTransactions).toHaveBeenCalledWith('merchant-1', 1, 20);
    });
  });

  describe('inviteTeamMember', () => {
    it('should call teamService.invite', async () => {
      const dto = { email: 'test@test.com', role: 'MANAGER' };
      await controller.inviteTeamMember('merchant-1', 'user-1', dto as never);
      expect(mockTeamService.invite).toHaveBeenCalledWith('merchant-1', 'user-1', dto);
    });
  });

  describe('addBankAccount', () => {
    it('should call bankService.addBankAccount', async () => {
      const dto = { bankName: 'HDFC', accountHolderName: 'John', accountNumber: '123', ifscCode: 'HDFC0001234', isPrimary: true };
      await controller.addBankAccount('merchant-1', dto as never);
      expect(mockBankService.addBankAccount).toHaveBeenCalledWith('merchant-1', dto);
    });
  });

  describe('createRecharge', () => {
    it('should call walletService.createRechargeOrder', async () => {
      const dto = { amount: 5000 };
      await controller.createRecharge('merchant-1', dto as never);
      expect(mockWalletService.createRechargeOrder).toHaveBeenCalledWith('merchant-1', 5000);
    });
  });

  describe('verifyRecharge', () => {
    it('should call walletService.verifyRecharge', async () => {
      const dto = { razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1' };
      await controller.verifyRecharge('merchant-1', dto as never);
      expect(mockWalletService.verifyRecharge).toHaveBeenCalledWith('merchant-1', dto);
    });
  });

  describe('requestRefund', () => {
    it('should call refundService.request', async () => {
      const dto = { amount: 1500, bankAccountId: 'bank-1' };
      await controller.requestRefund('merchant-1', dto as never);
      expect(mockRefundService.request).toHaveBeenCalledWith('merchant-1', dto);
    });
  });

  describe('listRefunds', () => {
    it('should call refundService.listMine', async () => {
      await controller.listRefunds('merchant-1', '1', '20');
      expect(mockRefundService.listMine).toHaveBeenCalledWith('merchant-1', 1, 20);
    });
  });

  describe('getRefund', () => {
    it('should call refundService.getMine', async () => {
      await controller.getRefund('merchant-1', 'refund-1');
      expect(mockRefundService.getMine).toHaveBeenCalledWith('refund-1', 'merchant-1');
    });
  });
});
