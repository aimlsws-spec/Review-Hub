import { ConfigService } from '@nestjs/config';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { NotificationQueueService } from '../../notification/services';
import { InvoiceService } from '../../settlement/services';
import { MerchantSubscriptionRepository, SubscriptionPlanRepository } from '../repositories';

import { MerchantSubscriptionService } from './merchant-subscription.service';

describe('MerchantSubscriptionService', () => {
  const tx = {
    merchantSubscription: { create: jest.fn(), update: jest.fn() },
    merchantServiceCharge: { update: jest.fn() },
    campaign: { update: jest.fn() },
  };
  const subscriptionRepository = {
    findCurrent: jest.fn(),
    findDueForRenewal: jest.fn(),
    update: jest.fn(),
    featuredPrice: jest.fn(),
    countFeaturedNow: jest.fn(),
    findCampaignForMerchant: jest.fn(),
    clearExpiredFeatures: jest.fn(),
    // Runs `apply` as the real one would, with a charge id only when something is charged.
    charge: jest.fn(async (input: { amounts: { totalAmount: number } }, apply: (t: typeof tx, id: string | null) => Promise<unknown>) => {
      const chargeId = input.amounts.totalAmount > 0 ? 'charge-1' : null;
      return { chargeId, result: await apply(tx, chargeId) };
    }),
  };
  const planRepository = { findById: jest.fn(), findActive: jest.fn() };
  const invoiceService = { generateForServiceCharge: jest.fn() };
  const notificationQueue = { enqueue: jest.fn() };
  const config = { get: jest.fn((_key: string, fallback: unknown) => fallback) };

  const service = new MerchantSubscriptionService(
    subscriptionRepository as unknown as MerchantSubscriptionRepository,
    planRepository as unknown as SubscriptionPlanRepository,
    invoiceService as unknown as InvoiceService,
    notificationQueue as unknown as NotificationQueueService,
    config as unknown as ConfigService,
  );

  const growth = { id: 'plan-growth', code: 'GROWTH', name: 'Growth', monthlyPrice: 999, isActive: true, featuredSlots: 1, deletedAt: null };
  const now = new Date('2026-10-03T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionRepository.findCurrent.mockResolvedValue(null);
    subscriptionRepository.featuredPrice.mockResolvedValue({ price: 199, days: 7 });
  });

  describe('subscribe', () => {
    it('charges the first month with GST, links the charge and invoices it', async () => {
      planRepository.findById.mockResolvedValue(growth);
      tx.merchantSubscription.create.mockResolvedValue({ id: 'sub-1' });

      const result = await service.subscribe('m-1', 'plan-growth', now);

      expect(subscriptionRepository.charge).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'm-1',
          type: 'SUBSCRIPTION',
          periodStart: now,
          periodEnd: new Date('2026-11-03T10:00:00Z'),
          amounts: { taxableAmount: 999, gstRate: 18, gstAmount: 179.82, totalAmount: 1178.82 },
        }),
        expect.any(Function),
      );
      expect(tx.merchantServiceCharge.update).toHaveBeenCalledWith({ where: { id: 'charge-1' }, data: { subscriptionId: 'sub-1' } });
      expect(invoiceService.generateForServiceCharge).toHaveBeenCalledWith('charge-1');
      expect(result).toEqual({ id: 'sub-1' });
    });

    it('charges and invoices nothing for a free plan', async () => {
      planRepository.findById.mockResolvedValue({ ...growth, monthlyPrice: 0 });
      tx.merchantSubscription.create.mockResolvedValue({ id: 'sub-1' });

      await service.subscribe('m-1', 'plan-basic', now);

      expect(tx.merchantServiceCharge.update).not.toHaveBeenCalled();
      expect(invoiceService.generateForServiceCharge).not.toHaveBeenCalled();
    });

    it('refuses a plan that is switched off, and a second plan while one runs', async () => {
      planRepository.findById.mockResolvedValue({ ...growth, isActive: false });
      await expect(service.subscribe('m-1', 'plan-growth', now)).rejects.toThrow('Subscription plan');

      planRepository.findById.mockResolvedValue(growth);
      subscriptionRepository.findCurrent.mockResolvedValue({ plan: { name: 'Basic' }, periodEnd: new Date('2026-10-20T00:00:00Z') });
      await expect(service.subscribe('m-1', 'plan-growth', now)).rejects.toThrow(/on the Basic plan/);
      expect(subscriptionRepository.charge).not.toHaveBeenCalled();
    });

    it('keeps the charge when the invoice fails to render', async () => {
      planRepository.findById.mockResolvedValue(growth);
      tx.merchantSubscription.create.mockResolvedValue({ id: 'sub-1' });
      invoiceService.generateForServiceCharge.mockRejectedValueOnce(new Error('pdf down'));

      await expect(service.subscribe('m-1', 'plan-growth', now)).resolves.toEqual({ id: 'sub-1' });
    });
  });

  describe('cancel and resume', () => {
    it('stops renewal but leaves the paid month running, and can undo that', async () => {
      subscriptionRepository.findCurrent.mockResolvedValue({ id: 'sub-1' });

      await service.cancel('m-1');
      await service.resume('m-1');

      expect(subscriptionRepository.update).toHaveBeenNthCalledWith(1, 'sub-1', { autoRenew: false, cancelledAt: expect.any(Date) });
      expect(subscriptionRepository.update).toHaveBeenNthCalledWith(2, 'sub-1', { autoRenew: true, cancelledAt: null });
    });

    it('refuses when there is no plan', async () => {
      await expect(service.cancel('m-1')).rejects.toThrow('Subscription');
    });
  });

  describe('featureCampaign', () => {
    beforeEach(() => {
      subscriptionRepository.findCampaignForMerchant.mockResolvedValue({ id: 'c-1', title: 'Diwali', status: 'ACTIVE', featuredUntil: null });
      tx.campaign.update.mockResolvedValue({ id: 'c-1', featured: true });
    });

    it('charges the featured price when the plan has no free slot left', async () => {
      subscriptionRepository.countFeaturedNow.mockResolvedValue(1);
      subscriptionRepository.findCurrent.mockResolvedValue({ status: 'ACTIVE', plan: { featuredSlots: 1 } });

      const result = await service.featureCampaign('m-1', 'c-1', now);

      expect(subscriptionRepository.charge.mock.calls[0][0].amounts.totalAmount).toBe(234.82);
      expect(tx.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c-1' }, data: { featured: true, featuredUntil: new Date('2026-10-10T10:00:00Z') } }),
      );
      expect(invoiceService.generateForServiceCharge).toHaveBeenCalledWith('charge-1');
      expect(result.includedInPlan).toBe(false);
    });

    it('is free while the plan has a slot', async () => {
      subscriptionRepository.countFeaturedNow.mockResolvedValue(0);
      subscriptionRepository.findCurrent.mockResolvedValue({ status: 'ACTIVE', plan: { featuredSlots: 1 } });

      const result = await service.featureCampaign('m-1', 'c-1', now);

      expect(subscriptionRepository.charge.mock.calls[0][0].amounts.totalAmount).toBe(0);
      expect(invoiceService.generateForServiceCharge).not.toHaveBeenCalled();
      expect(result.includedInPlan).toBe(true);
    });

    it('refuses a campaign that is not running or not the merchant’s', async () => {
      subscriptionRepository.findCampaignForMerchant.mockResolvedValueOnce({ id: 'c-1', status: 'PAUSED' });
      await expect(service.featureCampaign('m-1', 'c-1', now)).rejects.toThrow(BadRequestException);

      subscriptionRepository.findCampaignForMerchant.mockResolvedValueOnce(null);
      await expect(service.featureCampaign('m-1', 'c-x', now)).rejects.toThrow('Campaign');
    });
  });

  describe('renewDue', () => {
    const due = (overrides: Record<string, unknown> = {}) => ({
      id: 'sub-1',
      merchantId: 'm-1',
      status: 'ACTIVE',
      autoRenew: true,
      periodEnd: new Date('2026-10-03T00:00:00Z'),
      plan: { name: 'Growth', monthlyPrice: 999, deletedAt: null },
      merchant: { userId: 'owner-1' },
      ...overrides,
    });

    it('charges the next month and moves the period on', async () => {
      subscriptionRepository.findDueForRenewal.mockResolvedValue([due()]);

      await expect(service.renewDue(now)).resolves.toEqual({ renewed: 1, pastDue: 0, expired: 0 });
      expect(subscriptionRepository.charge.mock.calls[0][0]).toEqual(
        expect.objectContaining({ subscriptionId: 'sub-1', periodStart: new Date('2026-10-03T00:00:00Z'), periodEnd: new Date('2026-11-03T00:00:00Z') }),
      );
      expect(tx.merchantSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE', periodStart: new Date('2026-10-03T00:00:00Z'), periodEnd: new Date('2026-11-03T00:00:00Z') } }),
      );
    });

    it('marks an unpaid renewal past due and tells the merchant once', async () => {
      subscriptionRepository.findDueForRenewal.mockResolvedValue([due()]);
      subscriptionRepository.charge.mockRejectedValueOnce(new BadRequestException('short', 'INSUFFICIENT_BALANCE'));

      await expect(service.renewDue(now)).resolves.toEqual({ renewed: 0, pastDue: 1, expired: 0 });
      expect(subscriptionRepository.update).toHaveBeenCalledWith('sub-1', { status: 'PAST_DUE' });
      expect(notificationQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner-1', title: 'Your plan could not be renewed' }));
    });

    it('expires a cancelled plan, and one unpaid past the grace days', async () => {
      subscriptionRepository.findDueForRenewal.mockResolvedValue([
        due({ autoRenew: false }),
        due({ id: 'sub-2', status: 'PAST_DUE', periodEnd: new Date('2026-09-28T00:00:00Z') }),
      ]);

      await expect(service.renewDue(now)).resolves.toEqual({ renewed: 0, pastDue: 0, expired: 2 });
      expect(subscriptionRepository.charge).not.toHaveBeenCalled();
      expect(subscriptionRepository.update).toHaveBeenCalledWith('sub-2', { status: 'EXPIRED' });
    });

    it('lets any other failure through, so the job is retried', async () => {
      subscriptionRepository.findDueForRenewal.mockResolvedValue([due()]);
      subscriptionRepository.charge.mockRejectedValueOnce(new Error('database down'));

      await expect(service.renewDue(now)).rejects.toThrow('database down');
    });
  });

  it('un-features campaigns whose time is up', async () => {
    subscriptionRepository.clearExpiredFeatures.mockResolvedValue(3);

    await expect(service.expireFeaturedCampaigns(now)).resolves.toEqual({ unfeatured: 3 });
  });

  it('shows plans with their price including GST', async () => {
    planRepository.findActive.mockResolvedValue([growth]);

    const overview = await service.getOverview('m-1');

    expect(overview.plans[0].priceWithGst).toBe(1178.82);
    expect(overview.featured).toEqual({ price: 199, days: 7, priceWithGst: 234.82 });
  });
});
