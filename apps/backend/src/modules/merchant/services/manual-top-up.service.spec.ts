import { BadRequestException, ForbiddenException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { MANUAL_TOP_UP } from '../constants';

import { ManualTopUpService } from './manual-top-up.service';

describe('ManualTopUpService', () => {
  const merchantRepository = { findById: jest.fn() };
  const topUpRepository = {
    record: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    reverse: jest.fn(),
    findById: jest.fn(),
    findByMerchant: jest.fn(),
    findPendingApproval: jest.fn(),
  };
  const auditLogService = { record: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  const prisma = { platformConfiguration: { findFirst: jest.fn() } };
  let service: ManualTopUpService;

  const today = () => new Date().toISOString().slice(0, 10);
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const merchant = { id: 'merchant-1', userId: 'owner-1', status: 'ACTIVE', verificationStatus: 'APPROVED' };
  const request = (overrides: Record<string, unknown> = {}) => ({ amount: 25000, bankReference: 'UTR123456789', receivedOn: today(), ...overrides });
  const move = { balanceBefore: 1000, balanceAfter: 26000 };
  const stored = (overrides: Record<string, unknown> = {}) => ({
    id: 'topup-1',
    amount: '25000.00',
    bankReference: 'UTR123456789',
    recordedBy: 'admin-1',
    status: 'COMPLETED',
    merchantWallet: { merchantId: 'merchant-1' },
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    merchantRepository.findById.mockResolvedValue(merchant);
    prisma.platformConfiguration.findFirst.mockResolvedValue({ manualTopUpApprovalThreshold: '100000.00' });
    topUpRepository.record.mockImplementation(async (p: { needsApproval: boolean }) => ({
      topUp: stored({ status: p.needsApproval ? 'PENDING_APPROVAL' : 'COMPLETED' }),
      move: p.needsApproval ? null : move,
    }));
    topUpRepository.findById.mockResolvedValue(stored({ status: 'PENDING_APPROVAL' }));
    service = new ManualTopUpService(merchantRepository as never, topUpRepository as never, auditLogService as never, eventEmitter as never, prisma as never);
  });

  describe('recording', () => {
    it('credits a small top-up at once, records who did it, and returns the new balance', async () => {
      const result = await service.record('merchant-1', 'admin-1', request(), '10.0.0.1');

      expect(topUpRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({ merchantId: 'merchant-1', amount: 25000, bankReference: 'UTR123456789', recordedBy: 'admin-1', needsApproval: false }),
      );
      expect(result).toMatchObject({ id: 'topup-1', status: 'COMPLETED', balanceAfter: 26000 });
    });

    it('writes an audit entry with the admin, the amount, the reference and the balance before and after', async () => {
      await service.record('merchant-1', 'admin-1', request(), '10.0.0.1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorType: 'ADMIN',
          entity: 'MerchantWallet',
          entityId: 'merchant-1',
          ipAddress: '10.0.0.1',
          before: { availableBalance: 1000 },
          after: expect.objectContaining({ availableBalance: 26000, amount: 25000, bankReference: 'UTR123456789', manualTopUpId: 'topup-1' }),
        }),
      );
    });

    it('tells the merchant their wallet was topped up', async () => {
      await service.record('merchant-1', 'admin-1', request());

      expect(eventEmitter.emit).toHaveBeenCalledWith('merchant.wallet.topped_up', expect.objectContaining({ merchantId: 'merchant-1', amount: 25000, bankReference: 'UTR123456789', balanceAfter: 26000 }));
    });

    it('treats a reference with different case or spaces as the same transfer', async () => {
      await service.record('merchant-1', 'admin-1', request({ bankReference: 'utr 123 456 789' }));
      expect(topUpRepository.record.mock.calls[0][0].bankReference).toBe('UTR123456789');
    });

    it('does not audit or announce anything when recording fails, for example a reference already used', async () => {
      topUpRepository.record.mockRejectedValue(new Error('duplicate'));

      await expect(service.record('merchant-1', 'admin-1', request())).rejects.toThrow('duplicate');
      expect(auditLogService.record).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('still reports the credit as done when only the audit entry fails to write', async () => {
      auditLogService.record.mockRejectedValue(new Error('audit table locked'));
      await expect(service.record('merchant-1', 'admin-1', request())).resolves.toMatchObject({ id: 'topup-1' });
    });
  });

  describe('a large top-up needs a second admin', () => {
    it.each([
      ['just above the threshold', 100000.01, true],
      ['exactly the threshold', 100000, false],
      ['a small one', 99999.99, false],
    ])('%s', async (_label, amount, waits) => {
      await service.record('merchant-1', 'admin-1', request({ amount }));
      expect(topUpRepository.record.mock.calls[0][0].needsApproval).toBe(waits);
    });

    it('is recorded, but credits nothing, tells nobody a wallet was topped up, and says it is waiting', async () => {
      const result = await service.record('merchant-1', 'admin-1', request({ amount: 250000 }));

      expect(result).toMatchObject({ status: 'PENDING_APPROVAL', balanceAfter: null });
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ after: expect.objectContaining({ waitingForSecondAdmin: true, threshold: 100000 }) }));
    });

    it('follows the threshold the admin has set', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue({ manualTopUpApprovalThreshold: '5000.00' });

      await service.record('merchant-1', 'admin-1', request({ amount: 6000 }));

      expect(topUpRepository.record.mock.calls[0][0].needsApproval).toBe(true);
    });

    it('needs no second admin at all when the threshold is 0', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue({ manualTopUpApprovalThreshold: '0.00' });

      await service.record('merchant-1', 'admin-1', request({ amount: 900000 }));

      expect(topUpRepository.record.mock.calls[0][0].needsApproval).toBe(false);
    });

    it('uses the default threshold before any configuration has been saved', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue(null);

      await service.record('merchant-1', 'admin-1', request({ amount: MANUAL_TOP_UP.DEFAULT_APPROVAL_THRESHOLD + 1 }));

      expect(topUpRepository.record.mock.calls[0][0].needsApproval).toBe(true);
    });

    describe('approving', () => {
      beforeEach(() => topUpRepository.approve.mockResolvedValue({ topUp: stored({ status: 'COMPLETED', decidedBy: 'admin-2' }), move }));

      it('credits it, audits who approved and who recorded, and tells the merchant', async () => {
        const result = await service.approve('topup-1', 'admin-2', '10.0.0.2');

        expect(topUpRepository.approve).toHaveBeenCalledWith({ topUpId: 'topup-1', adminId: 'admin-2' });
        expect(result).toMatchObject({ balanceAfter: 26000 });
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ actorId: 'admin-2', action: 'APPROVE', after: expect.objectContaining({ recordedBy: 'admin-1', credited: 25000 }) }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith('merchant.wallet.topped_up', expect.objectContaining({ merchantId: 'merchant-1', amount: 25000 }));
      });

      it('refuses an admin approving money for their own business', async () => {
        await expect(service.approve('topup-1', 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);
        expect(topUpRepository.approve).not.toHaveBeenCalled();
      });

      it('says not found for a top-up that does not exist', async () => {
        topUpRepository.findById.mockResolvedValue(null);
        await expect(service.approve('nope', 'admin-2')).rejects.toBeInstanceOf(NotFoundException);
      });

      it('announces nothing when the repository refuses (already decided, or the recorder is approving)', async () => {
        topUpRepository.approve.mockRejectedValue(new ForbiddenException('You recorded this top-up'));

        await expect(service.approve('topup-1', 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
        expect(eventEmitter.emit).not.toHaveBeenCalled();
        expect(auditLogService.record).not.toHaveBeenCalled();
      });
    });

    describe('rejecting', () => {
      beforeEach(() => topUpRepository.reject.mockResolvedValue(stored({ status: 'REJECTED', bankReference: null, rejectedReference: 'UTR123456789' })));

      it('records the reason, audits it, and credits and announces nothing', async () => {
        await service.reject('topup-1', 'admin-2', 'The amount does not match the statement');

        expect(topUpRepository.reject).toHaveBeenCalledWith({ topUpId: 'topup-1', adminId: 'admin-2', reason: 'The amount does not match the statement' });
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({ actorId: 'admin-2', action: 'REJECT', after: expect.objectContaining({ releasedReference: 'UTR123456789' }) }),
        );
        expect(eventEmitter.emit).not.toHaveBeenCalled();
      });

      it('refuses an admin deciding money for their own business', async () => {
        await expect(service.reject('topup-1', 'owner-1', 'Not right at all')).rejects.toBeInstanceOf(ForbiddenException);
        expect(topUpRepository.reject).not.toHaveBeenCalled();
      });
    });
  });

  describe('reversing', () => {
    beforeEach(() => topUpRepository.reverse.mockResolvedValue({ topUp: stored({ status: 'REVERSED' }), move: { balanceBefore: 26000, balanceAfter: 1000 } }));

    it('takes it back out, audits the reason and the balance before and after, and tells the merchant', async () => {
      const result = await service.reverse('topup-1', 'admin-2', 'The amount was typed wrongly', '10.0.0.3');

      expect(topUpRepository.reverse).toHaveBeenCalledWith({ topUpId: 'topup-1', adminId: 'admin-2', reason: 'The amount was typed wrongly' });
      expect(result).toMatchObject({ status: 'REVERSED', balanceAfter: 1000 });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-2', before: { availableBalance: 26000 }, after: expect.objectContaining({ availableBalance: 1000, reason: 'The amount was typed wrongly' }) }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('merchant.wallet.top_up_reversed', expect.objectContaining({ merchantId: 'merchant-1', amount: 25000, reason: 'The amount was typed wrongly', balanceAfter: 1000 }));
    });

    it('can be done by the admin who recorded it: the mistake is theirs to correct', async () => {
      await expect(service.reverse('topup-1', 'admin-1', 'I typed the wrong amount')).resolves.toBeDefined();
    });

    it('refuses an admin reversing money for their own business', async () => {
      await expect(service.reverse('topup-1', 'owner-1', 'Because I want to')).rejects.toBeInstanceOf(ForbiddenException);
      expect(topUpRepository.reverse).not.toHaveBeenCalled();
    });

    it('announces nothing when the merchant has already used the money', async () => {
      topUpRepository.reverse.mockRejectedValue(new BadRequestException('Only ₹100.00 of this is still available'));

      await expect(service.reverse('topup-1', 'admin-2', 'Reversing it')).rejects.toBeInstanceOf(BadRequestException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('who it is for', () => {
    it('refuses a merchant that does not exist', async () => {
      merchantRepository.findById.mockResolvedValue(null);
      await expect(service.record('nope', 'admin-1', request())).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each(['PENDING', 'UNDER_REVIEW', 'REJECTED'])('refuses a merchant whose verification is %s', async (verificationStatus) => {
      merchantRepository.findById.mockResolvedValue({ ...merchant, verificationStatus });

      await expect(service.record('merchant-1', 'admin-1', request())).rejects.toBeInstanceOf(BadRequestException);
      expect(topUpRepository.record).not.toHaveBeenCalled();
    });

    it.each(['PENDING_VERIFICATION', 'SUSPENDED', 'REJECTED', 'DEACTIVATED'])('refuses a %s merchant', async (status) => {
      merchantRepository.findById.mockResolvedValue({ ...merchant, status });

      await expect(service.record('merchant-1', 'admin-1', request())).rejects.toBeInstanceOf(BadRequestException);
      expect(topUpRepository.record).not.toHaveBeenCalled();
    });

    it('refuses an admin crediting their own business', async () => {
      await expect(service.record('merchant-1', 'owner-1', request())).rejects.toBeInstanceOf(ForbiddenException);
      expect(topUpRepository.record).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('the date the money arrived', () => {
    it.each([
      ['a date that does not exist', '2026-02-30'],
      ['a date far in the future', '2099-01-01'],
      ['a date older than the limit', daysAgo(MANUAL_TOP_UP.MAX_AGE_DAYS + 5)],
    ])('refuses %s', async (_label, receivedOn) => {
      await expect(service.record('merchant-1', 'admin-1', request({ receivedOn }))).rejects.toBeInstanceOf(BadRequestException);
      expect(topUpRepository.record).not.toHaveBeenCalled();
    });

    it.each([['today', today()], ['a week ago', daysAgo(7)], ['just inside the limit', daysAgo(MANUAL_TOP_UP.MAX_AGE_DAYS - 2)]])('accepts %s', async (_label, receivedOn) => {
      await expect(service.record('merchant-1', 'admin-1', request({ receivedOn }))).resolves.toBeDefined();
    });

    it('passes a real date, not the text, to the repository', async () => {
      await service.record('merchant-1', 'admin-1', request({ receivedOn: daysAgo(3) }));
      expect(topUpRepository.record.mock.calls[0][0].receivedOn).toBeInstanceOf(Date);
    });
  });

  describe('lists', () => {
    it('lists a merchant’s top-ups', async () => {
      await service.list('merchant-1', 2, 10);
      expect(topUpRepository.findByMerchant).toHaveBeenCalledWith('merchant-1', 2, 10);
    });

    it('refuses an unknown merchant', async () => {
      merchantRepository.findById.mockResolvedValue(null);
      await expect(service.list('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the large top-ups waiting for a second admin', async () => {
      await service.listPendingApproval(1, 20);
      expect(topUpRepository.findPendingApproval).toHaveBeenCalledWith(1, 20);
    });
  });
});
