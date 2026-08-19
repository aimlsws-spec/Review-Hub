import { Test, TestingModule } from '@nestjs/testing';

import { BankAccountService } from '../services';

import { BankAccountController } from './bank-account.controller';

describe('BankAccountController', () => {
  let controller: BankAccountController;

  const mockBankAccountService = {
    addBankAccount: jest.fn(),
    getBankAccounts: jest.fn(),
    updateBankAccount: jest.fn(),
    deleteBankAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAccountController],
      providers: [{ provide: BankAccountService, useValue: mockBankAccountService }],
    }).compile();

    controller = module.get<BankAccountController>(BankAccountController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call bankAccountService.addBankAccount', async () => {
      const dto = { bankName: 'HDFC' };
      await controller.create('user-1', dto as never);
      expect(mockBankAccountService.addBankAccount).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('list', () => {
    it('should call bankAccountService.getBankAccounts', async () => {
      await controller.list('user-1');
      expect(mockBankAccountService.getBankAccounts).toHaveBeenCalledWith('user-1');
    });
  });

  describe('update', () => {
    it('should call bankAccountService.updateBankAccount', async () => {
      const dto = { isPrimary: true };
      await controller.update('user-1', 'bank-1', dto as never);
      expect(mockBankAccountService.updateBankAccount).toHaveBeenCalledWith('user-1', 'bank-1', dto);
    });
  });

  describe('remove', () => {
    it('should call bankAccountService.deleteBankAccount', async () => {
      await controller.remove('user-1', 'bank-1');
      expect(mockBankAccountService.deleteBankAccount).toHaveBeenCalledWith('user-1', 'bank-1');
    });
  });
});
