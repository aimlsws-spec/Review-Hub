import { Test, TestingModule } from '@nestjs/testing';

import { WalletService } from '../services';

import { WalletController } from './wallet.controller';

describe('WalletController', () => {
  let controller: WalletController;

  const mockWalletService = {
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    getMyRewards: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWallet', () => {
    it('should call walletService.getWallet', async () => {
      await controller.getWallet('user-1');
      expect(mockWalletService.getWallet).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getTransactions', () => {
    it('should call walletService.getTransactions', async () => {
      const query = { page: 1, limit: 20 };
      await controller.getTransactions('user-1', query as never);
      expect(mockWalletService.getTransactions).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('getRewards', () => {
    it('should call walletService.getMyRewards', async () => {
      const query = { page: 1, limit: 20 };
      await controller.getRewards('user-1', query as never);
      expect(mockWalletService.getMyRewards).toHaveBeenCalledWith('user-1', query);
    });
  });
});
