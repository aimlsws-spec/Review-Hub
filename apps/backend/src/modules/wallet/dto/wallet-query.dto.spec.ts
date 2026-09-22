import { buildValidationPipe } from '@common/pipes/validation.pipe';

import { WalletTransactionExportQueryDto, WalletTransactionQueryDto } from './wallet-query.dto';

/** Runs a query through the same pipe the app uses, so the result is what a request would get. */
const validate = (type: new () => object, value: unknown) => buildValidationPipe().transform(value, { type: 'query', metatype: type } as never);

describe('WalletTransactionQueryDto', () => {
  it('keeps the paging defaults and accepts no filter', async () => {
    await expect(validate(WalletTransactionQueryDto, {})).resolves.toMatchObject({ page: 1, limit: 20 });
  });

  it('accepts a type, a period and a search, together with paging', async () => {
    await expect(validate(WalletTransactionQueryDto, { page: '2', limit: '10', type: 'WITHDRAWAL', from: '2026-09-01', to: '2026-09-30', search: 'cafe' })).resolves.toMatchObject({
      page: 2,
      limit: 10,
      type: 'WITHDRAWAL',
      from: '2026-09-01',
      to: '2026-09-30',
      search: 'cafe',
    });
  });

  it('trims the search', async () => {
    await expect(validate(WalletTransactionQueryDto, { search: '  cafe ' })).resolves.toMatchObject({ search: 'cafe' });
  });

  it.each([{ type: 'MONEY' }, { from: '2026-9-1' }, { to: '01/09/2026' }, { from: '2026-09-01T00:00:00Z' }, { search: 'x'.repeat(51) }])('refuses %j', async (query) => {
    await expect(validate(WalletTransactionQueryDto, query)).rejects.toMatchObject({ status: 422 });
  });
});

describe('WalletTransactionExportQueryDto', () => {
  it('takes the same filter, and has no paging', async () => {
    await expect(validate(WalletTransactionExportQueryDto, { type: 'CREDIT', from: '2026-09-01' })).resolves.toMatchObject({ type: 'CREDIT', from: '2026-09-01' });
    await expect(validate(WalletTransactionExportQueryDto, { page: '2' })).rejects.toMatchObject({ status: 422 });
  });
});
