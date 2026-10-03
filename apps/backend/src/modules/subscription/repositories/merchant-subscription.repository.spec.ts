import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantSubscriptionRepository } from './merchant-subscription.repository';

describe('MerchantSubscriptionRepository', () => {
  const tx = {
    $queryRaw: jest.fn(),
    merchantWallet: { findUnique: jest.fn(), update: jest.fn() },
    merchantServiceCharge: { create: jest.fn(), update: jest.fn() },
    walletTransaction: { create: jest.fn() },
  };
  const prisma = {
    transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    merchantSubscription: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    platformConfiguration: { findFirst: jest.fn() },
    campaign: { count: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const repository = new MerchantSubscriptionRepository(prisma as unknown as PrismaService);

  const input = {
    merchantId: 'm-1',
    type: 'SUBSCRIPTION' as const,
    periodStart: new Date('2026-10-03T00:00:00Z'),
    periodEnd: new Date('2026-11-03T00:00:00Z'),
    amounts: { taxableAmount: 999, gstRate: 18, gstAmount: 179.82, totalAmount: 1178.82 },
    remarks: 'Growth plan, first month',
  };

  beforeEach(() => jest.clearAllMocks());

  it('locks the wallet, debits it, records the charge and its ledger entry, then applies', async () => {
    tx.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1', availableBalance: 2000 });
    tx.merchantServiceCharge.create.mockResolvedValue({ id: 'charge-1' });
    tx.walletTransaction.create.mockResolvedValue({ id: 'wt-1' });
    const apply = jest.fn().mockResolvedValue('applied');

    const result = await repository.charge(input, apply);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.merchantWallet.update).toHaveBeenCalledWith({ where: { id: 'wallet-1' }, data: { availableBalance: 821.18, totalSpent: { increment: 1178.82 } } });
    expect(tx.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'DEBIT', amount: 1178.82, balanceBefore: 2000, balanceAfter: 821.18, referenceType: 'MerchantServiceCharge', referenceId: 'charge-1' }),
    });
    expect(tx.merchantServiceCharge.update).toHaveBeenCalledWith({ where: { id: 'charge-1' }, data: { walletTransactionId: 'wt-1' } });
    expect(apply).toHaveBeenCalledWith(tx, 'charge-1');
    expect(result).toEqual({ chargeId: 'charge-1', result: 'applied' });
  });

  it('refuses when the wallet is short, before changing anything', async () => {
    tx.merchantWallet.findUnique.mockResolvedValue({ id: 'wallet-1', availableBalance: 100 });
    const apply = jest.fn();

    await expect(repository.charge(input, apply)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(tx.merchantWallet.update).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('records nothing for a total of zero, and only applies', async () => {
    const apply = jest.fn().mockResolvedValue('applied');

    await expect(repository.charge({ ...input, amounts: { ...input.amounts, totalAmount: 0 } }, apply)).resolves.toEqual({ chargeId: null, result: 'applied' });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledWith(tx, null);
  });

  it('reads the featured price, with the defaults when nothing is configured', async () => {
    prisma.platformConfiguration.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ featuredCampaignPrice: '249.00', featuredCampaignDays: 10 });

    await expect(repository.featuredPrice()).resolves.toEqual({ price: 199, days: 7 });
    await expect(repository.featuredPrice()).resolves.toEqual({ price: 249, days: 10 });
  });

  it('un-features only campaigns with an end date that has passed', async () => {
    prisma.campaign.updateMany.mockResolvedValue({ count: 2 });
    const now = new Date('2026-10-03T00:00:00Z');

    await expect(repository.clearExpiredFeatures(now)).resolves.toBe(2);
    expect(prisma.campaign.updateMany).toHaveBeenCalledWith({ where: { featured: true, featuredUntil: { lte: now } }, data: { featured: false } });
  });

  it('finds the running subscription and those due for renewal', async () => {
    const now = new Date('2026-10-03T00:00:00Z');
    await repository.findCurrent('m-1');
    await repository.findDueForRenewal(now);

    expect(prisma.merchantSubscription.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { merchantId: 'm-1', status: { in: ['ACTIVE', 'PAST_DUE'] } } }));
    expect(prisma.merchantSubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { in: ['ACTIVE', 'PAST_DUE'] }, periodEnd: { lte: now } } }));
  });
});
