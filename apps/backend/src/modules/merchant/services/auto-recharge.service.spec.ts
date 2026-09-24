import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PAYMENT_PROVIDER } from '../../payment/interfaces';
import { MerchantAutoRechargePaymentDueEvent, MerchantAutoRechargeTriggeredEvent } from '../events';
import { MerchantRepository, MerchantWalletRepository } from '../repositories';

import { AutoRechargeService } from './auto-recharge.service';

describe('AutoRechargeService', () => {
  let service: AutoRechargeService;

  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    updateAutoRechargeSettings: jest.fn(),
    findWalletsDueForAutoRecharge: jest.fn(),
    markAutoRechargeAttempted: jest.fn(),
    createPendingTopUp: jest.fn(),
    confirmTopUp: jest.fn(),
  };
  const mockMerchantRepository = { findById: jest.fn() };
  const mockConfigService = { get: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockPaymentService = { createOrder: jest.fn() };

  const merchant = { id: 'merchant-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoRechargeService,
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PAYMENT_PROVIDER, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get(AutoRechargeService);
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('throws when the merchant does not exist', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);
      await expect(service.getSettings('merchant-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the wallet auto-recharge fields', async () => {
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockWalletRepository.getOrCreate.mockResolvedValue({
        autoRechargeEnabled: true,
        autoRechargeThreshold: 500,
        autoRechargeAmount: 5000,
        lastAutoRechargeAt: null,
      });

      const result = await service.getSettings('merchant-1');
      expect(result).toEqual({ enabled: true, threshold: 500, amount: 5000, lastTriggeredAt: null });
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => mockMerchantRepository.findById.mockResolvedValue(merchant));

    it('throws when the merchant does not exist', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);
      await expect(service.updateSettings('merchant-1', { enabled: true, threshold: 500, amount: 5000 })).rejects.toThrow(NotFoundException);
    });

    it('rejects a threshold that is not below the recharge amount', async () => {
      await expect(service.updateSettings('merchant-1', { enabled: true, threshold: 5000, amount: 5000 })).rejects.toThrow(BadRequestException);
      await expect(service.updateSettings('merchant-1', { enabled: true, threshold: 6000, amount: 5000 })).rejects.toThrow(BadRequestException);
      expect(mockWalletRepository.updateAutoRechargeSettings).not.toHaveBeenCalled();
    });

    it('saves valid settings', async () => {
      mockWalletRepository.updateAutoRechargeSettings.mockResolvedValue({ autoRechargeEnabled: true });
      await service.updateSettings('merchant-1', { enabled: true, threshold: 500, amount: 5000 });
      expect(mockWalletRepository.updateAutoRechargeSettings).toHaveBeenCalledWith('merchant-1', { enabled: true, threshold: 500, amount: 5000 });
    });

    it('allows disabling without threshold/amount', async () => {
      mockWalletRepository.updateAutoRechargeSettings.mockResolvedValue({ autoRechargeEnabled: false });
      await service.updateSettings('merchant-1', { enabled: false });
      expect(mockWalletRepository.updateAutoRechargeSettings).toHaveBeenCalledWith('merchant-1', { enabled: false, threshold: undefined, amount: undefined });
    });
  });

  describe('runSweep', () => {
    const dueWallet = { id: 'wallet-1', merchantId: 'merchant-1', availableBalance: 400, autoRechargeThreshold: 500, autoRechargeAmount: 5000 };

    it('does nothing when no wallet is due', async () => {
      mockWalletRepository.findWalletsDueForAutoRecharge.mockResolvedValue([]);
      const result = await service.runSweep();
      expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    });

    it('marks the wallet attempted, and on the mock gateway completes the top-up synchronously', async () => {
      mockWalletRepository.findWalletsDueForAutoRecharge.mockResolvedValue([dueWallet]);
      mockConfigService.get.mockReturnValue('mock');
      mockWalletRepository.createPendingTopUp.mockResolvedValue({ id: 'txn-1' });
      mockWalletRepository.confirmTopUp.mockResolvedValue({ balanceAfter: 5400 });

      const result = await service.runSweep();

      expect(mockWalletRepository.markAutoRechargeAttempted).toHaveBeenCalledWith('wallet-1');
      expect(mockWalletRepository.confirmTopUp).toHaveBeenCalledWith('txn-1', expect.any(String));
      expect(mockPaymentService.createOrder).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'merchant.wallet.auto_recharge_triggered',
        expect.any(MerchantAutoRechargeTriggeredEvent),
      );
      expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    });

    it('on real Razorpay, creates an order and asks the merchant to complete it instead of silently charging', async () => {
      mockWalletRepository.findWalletsDueForAutoRecharge.mockResolvedValue([dueWallet]);
      mockConfigService.get.mockReturnValue('razorpay');
      mockPaymentService.createOrder.mockResolvedValue({ id: 'order_123' });
      mockWalletRepository.createPendingTopUp.mockResolvedValue({ id: 'txn-1' });

      const result = await service.runSweep();

      expect(mockPaymentService.createOrder).toHaveBeenCalledWith(5000, expect.stringContaining('auto-'));
      expect(mockWalletRepository.confirmTopUp).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'merchant.wallet.auto_recharge_payment_due',
        expect.any(MerchantAutoRechargePaymentDueEvent),
      );
      expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    });

    it('logs and continues past one wallet failing, rather than aborting the whole sweep', async () => {
      const secondWallet = { ...dueWallet, id: 'wallet-2', merchantId: 'merchant-2' };
      mockWalletRepository.findWalletsDueForAutoRecharge.mockResolvedValue([dueWallet, secondWallet]);
      mockConfigService.get.mockReturnValue('mock');
      mockWalletRepository.createPendingTopUp.mockRejectedValueOnce(new Error('db unavailable')).mockResolvedValueOnce({ id: 'txn-2' });
      mockWalletRepository.confirmTopUp.mockResolvedValue({ balanceAfter: 5400 });

      const result = await service.runSweep();

      expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 1 });
    });
  });
});
