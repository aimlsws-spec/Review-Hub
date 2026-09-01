import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { UserWalletRepository } from '../../wallet/repositories';
import { MARKETPLACE_EVENTS } from '../constants';
import { MarketplaceItemRepository, RedemptionRepository } from '../repositories';

import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  const mockItemRepository = { findById: jest.fn(), decrementStockIfTracked: jest.fn(), incrementStock: jest.fn(), findAll: jest.fn() };
  const mockRedemptionRepository = { create: jest.fn(), findByUser: jest.fn() };
  const mockWalletRepository = { getOrCreate: jest.fn(), debitForRedemption: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  const item = { id: 'item-1', title: 'Gift Card', isActive: true, costAmount: 100, stock: 5 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: MarketplaceItemRepository, useValue: mockItemRepository },
        { provide: RedemptionRepository, useValue: mockRedemptionRepository },
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    jest.clearAllMocks();
  });

  describe('redeem', () => {
    it('should throw NotFoundException for an unknown or inactive item', async () => {
      mockItemRepository.findById.mockResolvedValue(null);
      await expect(service.redeem('user-1', 'item-1')).rejects.toThrow(NotFoundException);
      expect(mockItemRepository.decrementStockIfTracked).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an inactive item', async () => {
      mockItemRepository.findById.mockResolvedValue({ ...item, isActive: false });
      await expect(service.redeem('user-1', 'item-1')).rejects.toThrow(NotFoundException);
    });

    it('should reserve stock, debit the wallet, and create a redemption with a generated code', async () => {
      mockItemRepository.findById.mockResolvedValue(item);
      mockItemRepository.decrementStockIfTracked.mockResolvedValue(true);
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockRedemptionRepository.create.mockResolvedValue({ id: 'redemption-1', redemptionCode: 'ABCDEF' });

      const result = await service.redeem('user-1', 'item-1');

      expect(mockWalletRepository.debitForRedemption).toHaveBeenCalledWith({
        walletId: 'wallet-1', amount: 100, referenceType: 'MarketplaceItem', referenceId: 'item-1', remarks: 'Redeemed: Gift Card',
      });
      expect(mockRedemptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', itemId: 'item-1', costAmount: 100, redemptionCode: expect.any(String) }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(MARKETPLACE_EVENTS.REDEEMED, expect.objectContaining({ userId: 'user-1', costAmount: 100 }));
      expect(result).toEqual({ id: 'redemption-1', redemptionCode: 'ABCDEF' });
    });

    it('should give the reserved stock back when the wallet debit fails on insufficient balance', async () => {
      mockItemRepository.findById.mockResolvedValue(item);
      mockItemRepository.decrementStockIfTracked.mockResolvedValue(true);
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockWalletRepository.debitForRedemption.mockRejectedValue(new BadRequestException('Insufficient wallet balance'));

      await expect(service.redeem('user-1', 'item-1')).rejects.toThrow(BadRequestException);

      expect(mockItemRepository.incrementStock).toHaveBeenCalledWith('item-1');
      expect(mockRedemptionRepository.create).not.toHaveBeenCalled();
    });

    it('should not attempt to compensate stock for unlimited-stock items', async () => {
      mockItemRepository.findById.mockResolvedValue({ ...item, stock: null });
      mockItemRepository.decrementStockIfTracked.mockResolvedValue(false);
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockWalletRepository.debitForRedemption.mockRejectedValue(new BadRequestException('Insufficient wallet balance'));

      await expect(service.redeem('user-1', 'item-1')).rejects.toThrow(BadRequestException);

      expect(mockItemRepository.incrementStock).not.toHaveBeenCalled();
    });

    it('should propagate an out-of-stock rejection without attempting the wallet debit', async () => {
      mockItemRepository.findById.mockResolvedValue(item);
      mockItemRepository.decrementStockIfTracked.mockRejectedValue(new BadRequestException('This item is out of stock'));

      await expect(service.redeem('user-1', 'item-1')).rejects.toThrow(BadRequestException);
      expect(mockWalletRepository.debitForRedemption).not.toHaveBeenCalled();
    });
  });
});
