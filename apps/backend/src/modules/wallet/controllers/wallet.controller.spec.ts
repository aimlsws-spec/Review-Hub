import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { WalletService } from '../services';

import { WalletController } from './wallet.controller';

describe('WalletController', () => {
  let controller: WalletController;

  const mockWalletService = {
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    exportTransactionsCsv: jest.fn(),
    getMyRewards: jest.fn(),
    getEarningsBreakdown: jest.fn(),
    getEarningsChart: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        // PaymentSimulationGuard (on the simulate route) needs ConfigService to be constructed.
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
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

  describe('exportTransactions', () => {
    const response = () => ({ setHeader: jest.fn(), send: jest.fn() });

    it('sends the statement as a CSV download, and says whether it was cut', async () => {
      mockWalletService.exportTransactionsCsv.mockResolvedValue({ filename: 'wallet-statement-2026-09-21.csv', content: 'a,b\r\n', truncated: true });
      const res = response();

      await controller.exportTransactions('user-1', { type: 'CREDIT' } as never, res as never);

      expect(mockWalletService.exportTransactionsCsv).toHaveBeenCalledWith('user-1', { type: 'CREDIT' });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="wallet-statement-2026-09-21.csv"');
      expect(res.setHeader).toHaveBeenCalledWith('X-Export-Truncated', 'true');
      expect(res.send).toHaveBeenCalledWith('a,b\r\n');
    });
  });

  describe('earnings', () => {
    it('passes the range and the chart period to the service for the signed-in user', async () => {
      await controller.getEarnings('user-1', { from: '2026-10-01' });
      await controller.getEarningsChart('user-1', { period: 'month' });

      expect(mockWalletService.getEarningsBreakdown).toHaveBeenCalledWith('user-1', { from: '2026-10-01' });
      expect(mockWalletService.getEarningsChart).toHaveBeenCalledWith('user-1', { period: 'month' });
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
