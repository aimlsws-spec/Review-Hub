import { Test, TestingModule } from '@nestjs/testing';

import { SystemRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { WithdrawalService } from '../services';

import { WithdrawalController } from './withdrawal.controller';

describe('WithdrawalController', () => {
  let controller: WithdrawalController;

  const mockWithdrawalService = {
    request: jest.fn(),
    listMine: jest.fn(),
    getMine: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    markPaid: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalController],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        RolesGuard,
      ],
    }).compile();

    controller = module.get<WithdrawalController>(WithdrawalController);
    jest.clearAllMocks();
  });

  describe('paying by hand', () => {
    it('marks a withdrawal paid as the signed-in admin, with the bank reference', async () => {
      const dto = { reference: 'UTR123456789', note: 'NEFT' };
      mockWithdrawalService.markPaid.mockResolvedValue({ id: 'withdrawal-1', status: 'PAID' });

      const result = await controller.markPaid('withdrawal-1', 'admin-1', dto);

      expect(mockWithdrawalService.markPaid).toHaveBeenCalledWith('withdrawal-1', 'admin-1', dto);
      expect(result).toHaveProperty('status', 'PAID');
    });

    it('marks a withdrawal failed as the signed-in admin', async () => {
      const dto = { reason: 'Account number rejected by the bank' };

      await controller.markFailed('withdrawal-1', 'admin-1', dto);

      expect(mockWithdrawalService.markFailed).toHaveBeenCalledWith('withdrawal-1', 'admin-1', dto);
    });

    it.each(['markPaid', 'markFailed'] as const)('%s is for admins only', (method) => {
      const roles = Reflect.getMetadata(ROLES_KEY, WithdrawalController.prototype[method]) as string[] | undefined;
      expect(roles).toBeDefined();
      expect(roles).toContain(SystemRole.Admin);
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('request', () => {
    it('should call withdrawalService.request with the requesting device id', async () => {
      const dto = { amount: 1500, bankAccountId: 'bank-1' };
      await controller.request('user-1', dto as never, 'device-1');
      expect(mockWithdrawalService.request).toHaveBeenCalledWith('user-1', dto, 'device-1');
    });

    it('should pass an undefined deviceId through when the token carries none', async () => {
      const dto = { amount: 1500, bankAccountId: 'bank-1' };
      await controller.request('user-1', dto as never);
      expect(mockWithdrawalService.request).toHaveBeenCalledWith('user-1', dto, undefined);
    });
  });

  describe('listMine', () => {
    it('should call withdrawalService.listMine with numeric pagination', async () => {
      await controller.listMine('user-1', '2', '10');
      expect(mockWithdrawalService.listMine).toHaveBeenCalledWith('user-1', 2, 10);
    });
  });

  describe('getMine', () => {
    it('should call withdrawalService.getMine', async () => {
      await controller.getMine('withdrawal-1', 'user-1');
      expect(mockWithdrawalService.getMine).toHaveBeenCalledWith('withdrawal-1', 'user-1');
    });
  });

  describe('approve', () => {
    it('should call withdrawalService.approve with the reviewer id', async () => {
      await controller.approve('withdrawal-1', 'admin-1');
      expect(mockWithdrawalService.approve).toHaveBeenCalledWith('withdrawal-1', 'admin-1');
    });
  });

  describe('reject', () => {
    it('should call withdrawalService.reject with the reviewer id and reason', async () => {
      const dto = { rejectionReason: 'Bank mismatch' };
      await controller.reject('withdrawal-1', 'admin-1', dto as never);
      expect(mockWithdrawalService.reject).toHaveBeenCalledWith('withdrawal-1', 'admin-1', dto);
    });
  });
});
