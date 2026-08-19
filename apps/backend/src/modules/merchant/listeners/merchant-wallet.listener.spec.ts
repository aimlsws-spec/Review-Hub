import { Test, TestingModule } from '@nestjs/testing';

import { MerchantWalletRepository } from '../repositories';

import { MerchantWalletListener } from './merchant-wallet.listener';

describe('MerchantWalletListener', () => {
  let listener: MerchantWalletListener;

  const mockWalletRepository = {
    findPendingTopUpByOrderId: jest.fn(),
    confirmTopUp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantWalletListener,
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
      ],
    }).compile();

    listener = module.get<MerchantWalletListener>(MerchantWalletListener);
    jest.clearAllMocks();
  });

  describe('handlePaymentCaptured', () => {
    it('should confirm the pending top-up when one exists for the order', async () => {
      mockWalletRepository.findPendingTopUpByOrderId.mockResolvedValue({ id: 'txn-1' });

      await listener.handlePaymentCaptured({ orderId: 'order_1', paymentId: 'pay_1' });

      expect(mockWalletRepository.confirmTopUp).toHaveBeenCalledWith('txn-1', 'pay_1');
    });

    it('should no-op when the captured payment is not a wallet recharge', async () => {
      mockWalletRepository.findPendingTopUpByOrderId.mockResolvedValue(null);

      await listener.handlePaymentCaptured({ orderId: 'order_1', paymentId: 'pay_1' });

      expect(mockWalletRepository.confirmTopUp).not.toHaveBeenCalled();
    });
  });
});
