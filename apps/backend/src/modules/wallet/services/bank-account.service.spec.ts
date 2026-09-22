import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { UserBankAccountRepository } from '../repositories';

import { BankAccountService } from './bank-account.service';

describe('BankAccountService', () => {
  let service: BankAccountService;

  const mockBankRepository = {
    countByUserId: jest.fn(),
    unsetPrimaryForUser: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
    softDelete: jest.fn(),
  };

  const dto = { bankName: 'HDFC', accountHolderName: 'Jane', accountNumber: '12345678901', ifscCode: 'HDFC0001234' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountService,
        { provide: UserBankAccountRepository, useValue: mockBankRepository },
      ],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
    jest.clearAllMocks();
  });

  describe('addBankAccount', () => {
    it('should make the first bank account primary automatically', async () => {
      mockBankRepository.countByUserId.mockResolvedValue(0);
      mockBankRepository.create.mockResolvedValue({ id: 'bank-1', isPrimary: true });

      const result = await service.addBankAccount('user-1', dto as never);
      expect(result).toHaveProperty('id', 'bank-1');
      expect(mockBankRepository.update).toHaveBeenCalledWith('bank-1', { isPrimary: true });
    });

    it('should reject once the account limit is reached', async () => {
      mockBankRepository.countByUserId.mockResolvedValue(3);

      await expect(service.addBankAccount('user-1', dto as never)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBankAccount', () => {
    it('should reject updating a bank account owned by someone else', async () => {
      mockBankRepository.findById.mockResolvedValue({ id: 'bank-1', userId: 'someone-else' });

      await expect(service.updateBankAccount('user-1', 'bank-1', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('the cooling period after a change', () => {
    const owned = { id: 'bank-1', userId: 'user-1', bankName: 'HDFC Bank', accountHolderName: 'Jane Doe', ifscCode: 'HDFC0000053' };

    beforeEach(() => mockBankRepository.findById.mockResolvedValue(owned));

    it.each([
      ['the account holder name', { accountHolderName: 'Someone Else' }],
      ['the IFSC code', { ifscCode: 'SBIN0000001' }],
      ['the bank name', { bankName: 'State Bank' }],
    ])('restarts the wait when %s changes', async (_label, change) => {
      await service.updateBankAccount('user-1', 'bank-1', change as never);

      expect(mockBankRepository.update).toHaveBeenCalledWith('bank-1', { ...change, detailsChangedAt: expect.any(Date) });
    });

    it('does not restart it when a field is sent unchanged', async () => {
      await service.updateBankAccount('user-1', 'bank-1', { accountHolderName: 'Jane Doe' } as never);

      expect(mockBankRepository.update).toHaveBeenCalledWith('bank-1', { accountHolderName: 'Jane Doe' });
    });

    it('does not restart it for details that do not change where money goes', async () => {
      await service.updateBankAccount('user-1', 'bank-1', { branch: 'Andheri', upiId: 'jane@bank' } as never);

      expect(mockBankRepository.update.mock.calls[0][1]).not.toHaveProperty('detailsChangedAt');
    });

    it('does not restart it when the account is only made the primary one', async () => {
      await service.updateBankAccount('user-1', 'bank-1', { isPrimary: true } as never);

      expect(mockBankRepository.update.mock.calls[0][1]).not.toHaveProperty('detailsChangedAt');
    });
  });

  describe('deleteBankAccount', () => {
    it('should soft delete an owned bank account', async () => {
      mockBankRepository.findById.mockResolvedValue({ id: 'bank-1', userId: 'user-1' });

      await service.deleteBankAccount('user-1', 'bank-1');
      expect(mockBankRepository.softDelete).toHaveBeenCalledWith('bank-1');
    });
  });
});
