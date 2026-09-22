import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * A person's wallet history: filtering it, paging through all of it, and downloading it as a spreadsheet. The
 * transactions are written straight into the database so their type, note and time can be exactly what a test needs,
 * including the moment IST midnight passes.
 */
describe('Wallet history (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let me: TestUser;
  let someoneElse: TestUser;

  const BOM = String.fromCharCode(0xfeff);

  const walletIdOf = async (user: TestUser): Promise<string> => (await api.get('/wallet', user.token).expect(200)).body.data.id;

  const add = (walletId: string, values: { type: 'CREDIT' | 'BONUS' | 'WITHDRAWAL' | 'REFERRAL'; before: number; after: number; remarks: string | null; at: string }) =>
    prisma.walletTransaction.create({
      data: { walletId, type: values.type, status: 'SUCCESS', amount: Math.abs(values.after - values.before), balanceBefore: values.before, balanceAfter: values.after, remarks: values.remarks, createdAt: new Date(values.at) },
    });

  const list = async (query = '') => (await api.get(`/wallet/transactions?${query}`, me.token).expect(200)).body.data as { data: { remarks: string | null; type: string }[]; total: number };
  const remarksOf = (page: { data: { remarks: string | null }[] }) => page.data.map((row) => row.remarks);

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    me = await api.registerUser();
    someoneElse = await api.registerUser();

    const mine = await walletIdOf(me);
    const theirs = await walletIdOf(someoneElse);

    // In the order they happened. All in 2025, so nothing else the test database holds can mix in.
    await add(mine, { type: 'CREDIT', before: 0, after: 100, remarks: 'Reward for Brew Bar', at: '2025-08-15T05:00:00Z' });
    await add(mine, { type: 'BONUS', before: 100, after: 150, remarks: 'Diwali bonus', at: '2025-08-20T05:00:00Z' });
    await add(mine, { type: 'WITHDRAWAL', before: 150, after: 50, remarks: null, at: '2025-08-25T05:00:00Z' });
    // Either side of IST midnight between 31 August and 1 September (18:30 UTC).
    await add(mine, { type: 'CREDIT', before: 50, after: 60, remarks: 'Last second of August', at: '2025-08-31T18:29:59Z' });
    await add(mine, { type: 'CREDIT', before: 60, after: 70, remarks: 'First second of September', at: '2025-08-31T18:30:00Z' });
    await add(mine, { type: 'REFERRAL', before: 70, after: 120, remarks: '=HYPERLINK("http://evil.example","x")', at: '2025-09-10T05:00:00Z' });

    await add(theirs, { type: 'CREDIT', before: 0, after: 999, remarks: 'SOMEONE ELSE PRIVATE NOTE', at: '2025-08-16T05:00:00Z' });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('the list', () => {
    it('is only my own transactions, newest first, and never anyone else’s', async () => {
      const page = await list('limit=50');

      expect(remarksOf(page)).toEqual(['=HYPERLINK("http://evil.example","x")', 'First second of September', 'Last second of August', null, 'Diwali bonus', 'Reward for Brew Bar']);
      expect(page.total).toBe(6);
      expect(JSON.stringify(page)).not.toContain('SOMEONE ELSE');
    });

    it('can be paged through to the oldest, so nothing is out of reach', async () => {
      const first = await list('limit=4&page=1');
      const second = await list('limit=4&page=2');

      expect(first.data).toHaveLength(4);
      expect(second.data).toHaveLength(2);
      expect(remarksOf(second)).toEqual(['Diwali bonus', 'Reward for Brew Bar']);
      expect(second.total).toBe(6);
    });

    it('narrows by type', async () => {
      expect(remarksOf(await list('type=BONUS'))).toEqual(['Diwali bonus']);
      expect(remarksOf(await list('type=WITHDRAWAL'))).toEqual([null]);
      expect((await list('type=CREDIT')).total).toBe(3);
    });

    it('finds words in the note, whatever the letter case', async () => {
      expect(remarksOf(await list('search=diwali'))).toEqual(['Diwali bonus']);
      expect(remarksOf(await list('search=second%20of'))).toEqual(['First second of September', 'Last second of August']);
      expect((await list('search=nothing-matches-this')).total).toBe(0);
    });

    it('narrows by period, counting whole India days', async () => {
      const august = await list('from=2025-08-01&to=2025-08-31&limit=50');

      expect(remarksOf(august)).toEqual(['Last second of August', null, 'Diwali bonus', 'Reward for Brew Bar']);
      expect(august.total).toBe(4);
    });

    it('starts a day at India midnight: the second before it is still yesterday, and the midnight itself is today', async () => {
      expect(remarksOf(await list('from=2025-09-01&to=2025-09-01'))).toEqual(['First second of September']);
      expect(remarksOf(await list('from=2025-08-31&to=2025-08-31'))).toEqual(['Last second of August']);
    });

    it('takes one date on its own as from then on, or up to then', async () => {
      expect(remarksOf(await list('from=2025-09-01&limit=50'))).toEqual(['=HYPERLINK("http://evil.example","x")', 'First second of September']);
      expect(remarksOf(await list('to=2025-08-15'))).toEqual(['Reward for Brew Bar']);
    });

    it('combines the type, the period and the search', async () => {
      expect(remarksOf(await list('type=CREDIT&from=2025-08-31&to=2025-09-30&search=september'))).toEqual(['First second of September']);
      expect((await list('type=BONUS&from=2025-09-01')).total).toBe(0);
    });

    it('counts the filtered total, not the whole history, so paging is right', async () => {
      const page = await list('type=CREDIT&limit=2');

      expect(page.data).toHaveLength(2);
      expect(page.total).toBe(3);
    });
  });

  describe('what is refused', () => {
    it.each(['from=2025-09-30&to=2025-09-01', 'from=2025-01-01&to=2026-12-31'])('refuses %s as a period that makes no sense', async (query) => {
      await api.get(`/wallet/transactions?${query}`, me.token).expect(400);
    });

    it.each(['from=2025-02-31', 'from=2025-9-1', 'to=01/09/2025', 'type=MONEY', `search=${'x'.repeat(51)}`])('refuses %s', async (query) => {
      const res = await api.get(`/wallet/transactions?${query}`, me.token);
      expect([400, 422]).toContain(res.status);
    });

    it('needs a signed-in user', async () => {
      await api.get('/wallet/transactions').expect(401);
      await api.get('/wallet/transactions/export').expect(401);
    });
  });

  describe('the statement download', () => {
    const download = (query = '') => api.get(`/wallet/transactions/export?${query}`, me.token);

    it('is a CSV file, named by date, with a header and a line for each of my transactions', async () => {
      const res = await download().expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="wallet-statement-\d{4}-\d{2}-\d{2}\.csv"/);
      expect(res.headers['x-export-truncated']).toBe('false');
      const lines = res.text.replace(BOM, '').trimEnd().split('\r\n');
      expect(lines[0]).toBe('Date (IST),Type,Status,Change (INR),Balance after (INR),Note');
      expect(lines).toHaveLength(7);
    });

    it('starts with the byte order mark, so Excel reads it as UTF-8', async () => {
      const res = await download().expect(200);

      expect(res.text.startsWith(BOM)).toBe(true);
    });

    it('shows each time in India time, and each change signed so money in and out are clear', async () => {
      const lines = (await download('type=WITHDRAWAL').expect(200)).text.replace(BOM, '').trimEnd().split('\r\n');

      expect(lines[1]).toBe('2025-08-25 10:30,WITHDRAWAL,SUCCESS,-100.00,50.00,');
      const credit = (await download('type=BONUS').expect(200)).text.replace(BOM, '').trimEnd().split('\r\n');
      expect(credit[1]).toBe('2025-08-20 10:30,BONUS,SUCCESS,50.00,150.00,Diwali bonus');
    });

    it('writes amounts as plain numbers a spreadsheet can add up, even when negative', async () => {
      const text = (await download().expect(200)).text;

      expect(text).toContain(',-100.00,50.00,');
      expect(text).not.toContain("'-100.00");
    });

    it('does not let a note be run as a formula when the file is opened', async () => {
      const text = (await download('type=REFERRAL').expect(200)).text;

      expect(text).toContain(`"'=HYPERLINK(""http://evil.example"",""x"")"`);
      expect(text).not.toMatch(/,=HYPERLINK/);
    });

    it('follows the same filter as the list', async () => {
      const lines = (await download('from=2025-08-31&to=2025-08-31').expect(200)).text.replace(BOM, '').trimEnd().split('\r\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('Last second of August');
    });

    it('never includes anyone else’s transactions', async () => {
      const res = await download().expect(200);

      expect(res.text).not.toContain('SOMEONE ELSE');
      expect(res.text).not.toContain('999.00');
    });

    it('is only a header when nothing matches', async () => {
      const lines = (await download('search=nothing-matches-this').expect(200)).text.replace(BOM, '').trimEnd().split('\r\n');

      expect(lines).toHaveLength(1);
    });

    it('refuses what the list refuses', async () => {
      await download('from=2025-09-30&to=2025-09-01').expect(400);
      await download('from=2025-02-31').expect(400);
    });

    it('does not take paging options: it is the whole filtered history', async () => {
      await download('page=2').expect(422);
    });
  });
});
