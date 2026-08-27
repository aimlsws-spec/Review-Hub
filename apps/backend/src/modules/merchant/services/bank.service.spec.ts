import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { MerchantRepository, MerchantBankRepository } from '../repositories';

import { BankService } from './bank.service';

describe('BankService', () => {
  let service: BankService;

  const mockMerchantRepository = {
    findById: jest.fn(),
  };

  const mockBankRepository = {
    countByMerchantId: jest.fn(),
    unsetPrimaryForMerchant: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findByMerchantId: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-1',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const mockBank = {
    id: 'bank-1',
    merchantId: 'merchant-1',
    bankName: 'HDFC Bank',
    accountHolderName: 'John Doe',
    accountNumber: '12345678901',
    ifscCode: 'HDFC0001234',
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantBankRepository, useValue: mockBankRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BankService>(BankService);
    jest.clearAllMocks();
  });

  describe('addBankAccount', () => {
    const dto = {
      bankName: 'HDFC Bank',
      accountHolderName: 'John Doe',
      accountNumber: '12345678901',
      ifscCode: 'HDFC0001234',
      isPrimary: true,
    };

    it('should add a bank account', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockBankRepository.countByMerchantId.mockResolvedValue(1);
      mockBankRepository.create.mockResolvedValue(mockBank);

      const result = await service.addBankAccount('merchant-1', dto);
      expect(result).toEqual(mockBank);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.bank.added', expect.any(Object));
    });

    it('should throw BadRequestException at bank limit', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockBankRepository.countByMerchantId.mockResolvedValue(5);

      await expect(service.addBankAccount('merchant-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.addBankAccount('unknown', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefaultBankAccount', () => {
    it('should set bank account as primary', async () => {
      mockBankRepository.findById.mockResolvedValue(mockBank);
      mockBankRepository.update.mockResolvedValue({ ...mockBank, isPrimary: true });

      const result = await service.setDefaultBankAccount('merchant-1', 'bank-1');
      expect(result).toHaveProperty('isPrimary', true);
    });

    it('should throw NotFoundException for unknown bank', async () => {
      mockBankRepository.findById.mockResolvedValue(null);

      await expect(service.setDefaultBankAccount('merchant-1', 'unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBankAccount', () => {
    it('should delete a bank account', async () => {
      mockBankRepository.findById.mockResolvedValue(mockBank);

      const result = await service.deleteBankAccount('merchant-1', 'bank-1');
      expect(result).toEqual({ message: 'Bank account removed successfully' });
    });
  });
});
