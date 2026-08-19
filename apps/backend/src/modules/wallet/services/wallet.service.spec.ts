import { Test, TestingModule } from '@nestjs/testing';

import { RewardRepository, UserWalletRepository } from '../repositories';

import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    findTransactions: jest.fn(),
  };
  const mockRewardRepository = {
    findByUser: jest.fn(),
    findByMerchant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: RewardRepository, useValue: mockRewardRepository },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should get or create a wallet for the user', async () => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1', availableBalance: 0 });

      const result = await service.getWallet('user-1');
      expect(result).toHaveProperty('id', 'wallet-1');
      expect(mockWalletRepository.getOrCreate).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getTransactions', () => {
    it('should resolve the wallet then fetch its transactions', async () => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockWalletRepository.findTransactions.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getTransactions('user-1', { page: 1, limit: 20 } as never);
      expect(mockWalletRepository.findTransactions).toHaveBeenCalledWith('wallet-1', 1, 20, undefined);
    });
  });

  describe('getMyRewards', () => {
    it('should list rewards scoped to the user', async () => {
      mockRewardRepository.findByUser.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getMyRewards('user-1', { page: 1, limit: 20 } as never);
      expect(mockRewardRepository.findByUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('getMerchantRewards', () => {
    it('should delegate to the repository scoped by merchant', async () => {
      mockRewardRepository.findByMerchant.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getMerchantRewards('merchant-1', 1, 20);
      expect(mockRewardRepository.findByMerchant).toHaveBeenCalledWith({ merchantId: 'merchant-1', page: 1, limit: 20 });
    });
  });
});
