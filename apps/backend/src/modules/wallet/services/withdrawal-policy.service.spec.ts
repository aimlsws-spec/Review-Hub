import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { WITHDRAWAL_DEFAULTS } from '../constants';

import { WithdrawalPolicyService, WithdrawalSettings } from './withdrawal-policy.service';

describe('WithdrawalPolicyService', () => {
  const prisma = { platformConfiguration: { findFirst: jest.fn() } };
  let service: WithdrawalPolicyService;

  const settings: WithdrawalSettings = {
    minimum: 1000,
    maximum: 50000,
    dailyLimit: 50000,
    monthlyLimit: null,
    bankCoolingHours: 24,
    payoutMode: 'GATEWAY',
    tds: { rate: 0, annualThreshold: 0, section: null },
  };
  const hoursAgo = (hours: number, now = new Date()) => new Date(now.getTime() - hours * 60 * 60 * 1000);

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WithdrawalPolicyService(prisma as never);
  });

  describe('getSettings', () => {
    it('reads the rules an admin saved, turning the stored decimals into numbers', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue({
        minimumWithdrawal: '500.00',
        maximumWithdrawal: '20000.00',
        dailyWithdrawalLimit: '30000.00',
        monthlyWithdrawalLimit: '100000.00',
        bankCoolingHours: 12,
        payoutMode: 'MANUAL',
        tdsRate: '0.1000',
        tdsAnnualThreshold: '20000.00',
        tdsSection: '194R',
      });

      await expect(service.getSettings()).resolves.toEqual({
        minimum: 500,
        maximum: 20000,
        dailyLimit: 30000,
        monthlyLimit: 100000,
        bankCoolingHours: 12,
        payoutMode: 'MANUAL',
        tds: { rate: 0.1, annualThreshold: 20000, section: '194R' },
      });
    });

    it('treats an empty monthly limit as no monthly limit', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue({
        minimumWithdrawal: 1000, maximumWithdrawal: 50000, dailyWithdrawalLimit: 50000, monthlyWithdrawalLimit: null, bankCoolingHours: 24, payoutMode: 'GATEWAY',
        tdsRate: 0, tdsAnnualThreshold: 0, tdsSection: null,
      });

      expect((await service.getSettings()).monthlyLimit).toBeNull();
    });

    it('falls back to the defaults, which match the spec, when nothing has been saved', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.getSettings()).resolves.toEqual({
        minimum: 1000,
        maximum: 50000,
        dailyLimit: 50000,
        monthlyLimit: null,
        bankCoolingHours: 24,
        payoutMode: 'GATEWAY',
        tds: { rate: 0, annualThreshold: 0, section: null },
      });
      expect(WITHDRAWAL_DEFAULTS.MINIMUM).toBe(1000);
    });

    it('ignores a configuration that was deleted', async () => {
      prisma.platformConfiguration.findFirst.mockResolvedValue(null);

      await service.getSettings();

      expect(prisma.platformConfiguration.findFirst).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });
  });

  describe('assertAmountAllowed', () => {
    it.each([[1000], [25000], [50000]])('allows ₹%d', (amount) => {
      expect(() => service.assertAmountAllowed(settings, amount)).not.toThrow();
    });

    it('refuses just below the minimum, naming the minimum', () => {
      expect(() => service.assertAmountAllowed(settings, 999.99)).toThrow(/Minimum withdrawal amount is ₹1,000/);
    });

    it('refuses just above the maximum, naming the maximum', () => {
      expect(() => service.assertAmountAllowed(settings, 50000.01)).toThrow(/Maximum withdrawal amount is ₹50,000 at a time/);
    });

    it('uses the numbers it is given, not fixed ones', () => {
      const custom = { ...settings, minimum: 200, maximum: 300 };

      expect(() => service.assertAmountAllowed(custom, 250)).not.toThrow();
      expect(() => service.assertAmountAllowed(custom, 199)).toThrow(BadRequestException);
      expect(() => service.assertAmountAllowed(custom, 301)).toThrow(BadRequestException);
    });
  });

  describe('the cooling period', () => {
    const now = new Date('2026-09-21T12:00:00Z');
    const bank = (created: number, changed: number | null = null) => ({ createdAt: hoursAgo(created, now), detailsChangedAt: changed === null ? null : hoursAgo(changed, now) });

    it('is not a wait at all when set to 0 hours', () => {
      expect(service.coolingEndsAt(bank(0), 0)).toBeNull();
      expect(() => service.assertBankReady(bank(0), { ...settings, bankCoolingHours: 0 }, now)).not.toThrow();
    });

    it('ends the set number of hours after the account was added', () => {
      expect(service.coolingEndsAt(bank(5), 24)?.toISOString()).toBe('2026-09-22T07:00:00.000Z');
    });

    it('starts from the later of when it was added and when its payout details changed', () => {
      expect(service.coolingEndsAt(bank(100, 2), 24)?.toISOString()).toBe('2026-09-22T10:00:00.000Z');
      expect(service.coolingEndsAt(bank(2, 100), 24)?.toISOString()).toBe('2026-09-22T10:00:00.000Z');
    });

    it('refuses a new account, counting the hours left up so nobody is told 0 hours', () => {
      const almostThere = { createdAt: new Date(now.getTime() - (24 * 60 - 5) * 60 * 1000), detailsChangedAt: null };

      expect(() => service.assertBankReady(almostThere, settings, now)).toThrow(/about 1 hour\./);
      expect(() => service.assertBankReady(bank(2), settings, now)).toThrow(/about 22 hours/);
    });

    it('allows an account exactly when the wait ends, and after', () => {
      expect(() => service.assertBankReady(bank(24), settings, now)).not.toThrow();
      expect(() => service.assertBankReady(bank(200), settings, now)).not.toThrow();
    });

    it('follows the number of hours an admin sets', () => {
      expect(() => service.assertBankReady(bank(5), { ...settings, bankCoolingHours: 4 }, now)).not.toThrow();
      expect(() => service.assertBankReady(bank(5), { ...settings, bankCoolingHours: 6 }, now)).toThrow(BadRequestException);
    });
  });
});
