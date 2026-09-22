import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { TRANSACTION_MAX_RANGE_DAYS, buildTransactionFilter, transactionWhere } from './transaction-filter';

describe('buildTransactionFilter', () => {
  it('is empty when nothing is asked', () => {
    expect(buildTransactionFilter({})).toEqual({});
  });

  it('carries the type and a trimmed search', () => {
    expect(buildTransactionFilter({ type: 'WITHDRAWAL', search: '  cafe  ' })).toEqual({ type: 'WITHDRAWAL', search: 'cafe' });
  });

  it('ignores a search that is only spaces', () => {
    expect(buildTransactionFilter({ search: '   ' })).toEqual({});
  });

  it('turns India days into an instant range that includes the whole last day', () => {
    const filter = buildTransactionFilter({ from: '2026-09-01', to: '2026-09-30' });

    expect(filter.createdFrom?.toISOString()).toBe('2026-08-31T18:30:00.000Z'); // 1 September, 00:00 IST
    expect(filter.createdBefore?.toISOString()).toBe('2026-09-30T18:30:00.000Z'); // 1 October, 00:00 IST
  });

  it('takes one day alone as that whole day', () => {
    const filter = buildTransactionFilter({ from: '2026-09-21', to: '2026-09-21' });

    expect((filter.createdBefore as Date).getTime() - (filter.createdFrom as Date).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('takes one date on its own as "from then on", or "up to then"', () => {
    expect(buildTransactionFilter({ from: '2026-09-01' })).toEqual({ createdFrom: expect.any(Date) });
    expect(buildTransactionFilter({ to: '2026-09-01' })).toEqual({ createdBefore: expect.any(Date) });
  });

  it.each([{ from: '2026-02-31' }, { to: '2026-13-01' }, { from: 'yesterday' }])('refuses %j: not a real date', (query) => {
    expect(() => buildTransactionFilter(query)).toThrow(BadRequestException);
  });

  it('refuses a start after the end', () => {
    expect(() => buildTransactionFilter({ from: '2026-09-30', to: '2026-09-01' })).toThrow(/after/);
  });

  it('allows up to a year, and refuses more, so one request can not ask for every row there is', () => {
    expect(() => buildTransactionFilter({ from: '2026-01-01', to: '2026-12-31' })).not.toThrow(); // 364 days apart
    expect(() => buildTransactionFilter({ from: '2025-01-01', to: '2026-12-31' })).toThrow(new RegExp(String(TRANSACTION_MAX_RANGE_DAYS)));
  });
});

describe('transactionWhere', () => {
  it('is always tied to the wallet, and nothing else with no filter', () => {
    expect(transactionWhere('wallet-1', {})).toEqual({ walletId: 'wallet-1' });
  });

  it('adds the type, the note search and the date range', () => {
    const from = new Date('2026-08-31T18:30:00Z');
    const before = new Date('2026-09-30T18:30:00Z');

    expect(transactionWhere('wallet-1', { type: 'CREDIT', search: 'cafe', createdFrom: from, createdBefore: before })).toEqual({
      walletId: 'wallet-1',
      type: 'CREDIT',
      remarks: { contains: 'cafe' },
      createdAt: { gte: from, lt: before },
    });
  });

  it('only sets the ends of the range that were asked for', () => {
    const from = new Date('2026-08-31T18:30:00Z');

    expect(transactionWhere('wallet-1', { createdFrom: from }).createdAt).toEqual({ gte: from });
  });
});
