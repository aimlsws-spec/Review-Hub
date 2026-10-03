import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantSuggestionRepository } from './merchant-suggestion.repository';

describe('MerchantSuggestionRepository', () => {
  const prisma = {
    merchant: { findMany: jest.fn() },
    merchantSuggestion: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  };
  const repository = new MerchantSuggestionRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('finds merchants with a running campaign', async () => {
    await repository.findMerchantsWithActiveCampaigns();

    expect(prisma.merchant.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, campaigns: { some: { status: 'ACTIVE', deletedAt: null } } },
      select: { id: true, userId: true },
    });
  });

  it('checks for the same suggestion since a date', async () => {
    prisma.merchantSuggestion.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const since = new Date('2026-09-26T00:00:00Z');

    await expect(repository.existsSince('m-1', 'LOW', 'c-1', since)).resolves.toBe(true);
    await expect(repository.existsSince('m-1', 'LOW', null, since)).resolves.toBe(false);
    expect(prisma.merchantSuggestion.count).toHaveBeenLastCalledWith({ where: { merchantId: 'm-1', code: 'LOW', campaignId: null, createdAt: { gte: since } } });
  });

  it('stores a suggestion, lists open ones and dismisses only the merchant’s own', async () => {
    prisma.merchantSuggestion.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await repository.create({ merchantId: 'm-1', code: 'LOW', severity: 'WARNING', title: 't', detail: 'd' });
    await repository.findOpen('m-1', 20);

    expect(prisma.merchantSuggestion.create).toHaveBeenCalledWith({
      data: { merchant: { connect: { id: 'm-1' } }, campaignId: null, code: 'LOW', severity: 'WARNING', title: 't', detail: 'd' },
    });
    expect(prisma.merchantSuggestion.findMany).toHaveBeenCalledWith({ where: { merchantId: 'm-1', dismissedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 });
    await expect(repository.dismiss('m-1', 's-1')).resolves.toBe(true);
    await expect(repository.dismiss('m-1', 's-2')).resolves.toBe(false);
    expect(prisma.merchantSuggestion.updateMany).toHaveBeenLastCalledWith({ where: { id: 's-2', merchantId: 'm-1', dismissedAt: null }, data: { dismissedAt: expect.any(Date) } });
  });
});
