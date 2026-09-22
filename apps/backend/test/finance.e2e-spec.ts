import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { PAYMENT_EVENTS } from '../src/modules/payment/constants';

import { Api, TestMerchant, TestUser } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * Tax and the tax documents. TDS is tax kept back from user payouts: it must be worked out once, from the whole of the
 * right payout, and undone if the payout fails. Credit and debit notes adjust a GST invoice: a credit note can never take
 * off more than the invoice is worth, even when several are issued at the same moment.
 */
describe('Finance: TDS and credit/debit notes (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let adminToken: string;

  const setRules = (rules: Record<string, unknown>) => api.patch('/admin/platform-configuration', adminToken).send(rules).expect(200);
  const defaults = { tdsRate: 0, tdsAnnualThreshold: 0, tdsSection: null, payoutMode: 'GATEWAY' };

  const walletOf = async (user: TestUser) => {
    const wallet = (await api.get('/wallet', user.token).expect(200)).body.data;
    return { available: Number(wallet.availableBalance), locked: Number(wallet.lockedBalance), withdrawn: Number(wallet.totalWithdrawn) };
  };

  const readyUser = async (balance = 10000) => {
    const user = await api.registerUser();
    await api.fundWallet(user, balance);
    await api.approvePan(user, adminToken);
    return { user, bankAccountId: await api.addBankAccount(user) };
  };

  const request = async (user: TestUser, bankAccountId: string, amount: number): Promise<string> =>
    (await api.post('/withdrawals', user.token).send({ amount, bankAccountId }).expect(201)).body.data.id;
  const approve = (id: string) => api.post(`/withdrawals/${id}/approve`, adminToken);
  const withdrawalRow = (id: string) => prisma.withdrawalRequest.findUniqueOrThrow({ where: { id } });

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    adminToken = await api.adminToken();
  });

  afterEach(async () => {
    await setRules(defaults);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TDS settings', () => {
    it('will not turn TDS on without the income tax section', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ tdsRate: 0.1 }).expect(400);
    });

    it('refuses a rate that is not a sensible fraction', async () => {
      await api.patch('/admin/platform-configuration', adminToken).send({ tdsRate: 1.5, tdsSection: '194R' }).expect(422);
      await api.patch('/admin/platform-configuration', adminToken).send({ tdsRate: -0.1, tdsSection: '194R' }).expect(422);
    });

    it('only an admin can change them', async () => {
      const { user } = await readyUser(0);
      await api.patch('/admin/platform-configuration', user.token).send({ tdsRate: 0.1, tdsSection: '194R' }).expect(403);
    });
  });

  describe('kept back from payouts', () => {
    it('keeps nothing back while TDS is off', async () => {
      const { user, bankAccountId } = await readyUser();
      const id = await request(user, bankAccountId, 1000);

      await approve(id).expect(200);

      expect(await withdrawalRow(id)).toMatchObject({ tdsAmount: expect.anything() });
      const row = await withdrawalRow(id);
      expect(Number(row.tdsAmount)).toBe(0);
      expect(Number(row.finalAmount)).toBe(1000);
      expect(await prisma.tdsDeduction.count({ where: { withdrawalId: id } })).toBe(0);
    });

    it('keeps nothing back until the year total goes over the threshold, then keeps it back from the whole of that payout', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 2000 });

      const first = await request(user, bankAccountId, 1000);
      await approve(first).expect(200);
      expect(Number((await withdrawalRow(first)).tdsAmount)).toBe(0);

      const second = await request(user, bankAccountId, 1500);
      const res = await approve(second).expect(200);

      expect(Number(res.body.data.tdsAmount)).toBe(150);
      expect(Number(res.body.data.finalAmount)).toBe(1350);
      expect(await prisma.tdsDeduction.findUnique({ where: { withdrawalId: second } })).toMatchObject({
        userId: user.id,
        section: '194R',
        status: 'DEDUCTED',
        financialYear: expect.stringMatching(/^\d{4}-\d{2}$/),
      });
      // The whole 1,500 leaves the wallet: tax is taken out of what is sent, not out of what the user is owed.
      expect(await walletOf(user)).toMatchObject({ withdrawn: 2500 });
    });

    it('records the PAN the user had approved', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });

      const id = await request(user, bankAccountId, 1000);
      await approve(id).expect(200);

      const deduction = await prisma.tdsDeduction.findUniqueOrThrow({ where: { withdrawalId: id } });
      expect(deduction.panNumber).toMatch(/^ABCDE\d{4}F$/);
      expect(Number(deduction.grossAmount)).toBe(1000);
      expect(Number(deduction.tdsAmount)).toBe(100);
      expect(Number(deduction.netAmount)).toBe(900);
    });

    it('keeps tax back once, not twice, when the same withdrawal is approved several times at once', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });
      const id = await request(user, bankAccountId, 1000);

      const results = await Promise.all([1, 2, 3].map(() => approve(id)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(await prisma.tdsDeduction.count({ where: { withdrawalId: id } })).toBe(1);
      expect(Number((await withdrawalRow(id)).finalAmount)).toBe(900);
    });

    it('does not let two of one user’s payouts approved at the same moment both slip under the threshold', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 1500 });
      const a = await request(user, bankAccountId, 1000);
      const b = await request(user, bankAccountId, 1000);

      await Promise.all([approve(a), approve(b)]);

      const kept = [Number((await withdrawalRow(a)).tdsAmount), Number((await withdrawalRow(b)).tdsAmount)].sort((x, y) => x - y);
      // Whichever was approved second took the total over 1,500, so exactly one of them has tax kept back.
      expect(kept).toEqual([0, 100]);
    });

    it('gives the tax back, and marks the deduction reversed, when the payout fails', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });
      const id = await request(user, bankAccountId, 1000);
      await approve(id).expect(200);

      await app.get(EventEmitter2).emitAsync(PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED, { payoutId: 'pout_tds', referenceId: id, status: 'failed', utr: null, failureReason: 'Bank down' });

      expect(await prisma.tdsDeduction.findUniqueOrThrow({ where: { withdrawalId: id } })).toMatchObject({ status: 'REVERSED', reversedAt: expect.any(Date) });
      expect(await walletOf(user)).toEqual({ available: 10000, locked: 0, withdrawn: 0 });
    });

    it('keeps nothing back from a withdrawal that was rejected', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });
      const id = await request(user, bankAccountId, 1000);

      await api.post(`/withdrawals/${id}/reject`, adminToken).send({ rejectionReason: 'Details do not match.' }).expect(200);

      expect(await prisma.tdsDeduction.count({ where: { withdrawalId: id } })).toBe(0);
      expect(Number((await withdrawalRow(id)).tdsAmount)).toBe(0);
    });

    it('a payout paid by hand is for what is left after tax', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0, payoutMode: 'MANUAL' });
      const id = await request(user, bankAccountId, 1000);
      await approve(id).expect(200);

      const queue = await api.get('/admin/withdrawals/awaiting-payout?limit=100', adminToken).expect(200);
      const waiting = (queue.body.data.data as { id: string; finalAmount: string }[]).find((w) => w.id === id);

      expect(Number(waiting?.finalAmount)).toBe(900);
    });
  });

  describe('the TDS report', () => {
    it('lists deductions with totals, and leaves reversed ones out of the totals', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });
      const before = (await api.get('/admin/tds?limit=100', adminToken).expect(200)).body.data.summary;

      const kept = await request(user, bankAccountId, 2000);
      const reversed = await request(user, bankAccountId, 1000);
      await approve(kept).expect(200);
      await approve(reversed).expect(200);
      await app.get(EventEmitter2).emitAsync(PAYMENT_EVENTS.PAYOUT_STATUS_CHANGED, { payoutId: 'pout_rep', referenceId: reversed, status: 'failed', utr: null, failureReason: 'Bank down' });

      const after = (await api.get('/admin/tds?limit=100', adminToken).expect(200)).body.data;
      const rows = after.data as { withdrawalId: string; status: string; userName: string }[];

      expect(rows.find((r) => r.withdrawalId === kept)).toMatchObject({ status: 'DEDUCTED', userName: 'E2E Person' });
      expect(rows.find((r) => r.withdrawalId === reversed)?.status).toBe('REVERSED');
      expect(after.summary.tdsKeptBack - before.tdsKeptBack).toBe(200);
      expect(after.summary.deductions - before.deductions).toBe(1);
    });

    it('filters by status', async () => {
      const res = await api.get('/admin/tds?status=REVERSED&limit=100', adminToken).expect(200);
      expect((res.body.data.data as { status: string }[]).every((r) => r.status === 'REVERSED')).toBe(true);
    });

    it('exports a CSV a spreadsheet can open, with the PAN and the amounts', async () => {
      const { user, bankAccountId } = await readyUser();
      await setRules({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 0 });
      const id = await request(user, bankAccountId, 1000);
      await approve(id).expect(200);

      const res = await api.get('/admin/tds/export', adminToken).expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="tds-\d{4}-\d{2}\.csv"/);
      expect(res.text.split('\r\n')[0]).toBe('Financial year,Date,Deductee,PAN,Section,Amount paid,Rate,TDS,Paid to user,Status,Withdrawal');
      const line = res.text.split('\r\n').find((l) => l.includes(id));
      expect(line).toMatch(/,E2E Person,ABCDE\d{4}F,194R,1000\.00,0\.1000,100\.00,900\.00,DEDUCTED,/);
    });

    it('is for admins only, and refuses a financial year that does not make sense', async () => {
      const { user } = await readyUser(0);
      await api.get('/admin/tds', user.token).expect(403);
      await api.get('/admin/tds/export', user.token).expect(403);
      await api.get('/admin/tds?financialYear=2026-28', adminToken).expect(400);
      await api.get('/admin/tds?status=NOPE', adminToken).expect(400);
    });
  });

  describe('credit and debit notes', () => {
    let merchant: TestMerchant;
    let counter = 0;

    /** An invoice worth 1,000 before GST, made directly: the nightly job only bills a merchant for their spend. */
    const makeInvoice = async (owner: TestMerchant = merchant, taxable = 1000) => {
      // Taken once, up front: several invoices are made at the same moment and each needs its own number.
      const n = (counter += 1);
      const stamp = Date.now();
      const settlement = await prisma.settlement.create({
        data: {
          merchantId: owner.merchantId,
          periodStart: new Date(stamp - n * 86400000 * 7 - 86400000),
          periodEnd: new Date(stamp - n * 86400000 * 7),
          commissionRate: 0.1,
          commissionAmount: taxable,
        },
      });
      return prisma.invoice.create({
        data: {
          settlementId: settlement.id,
          merchantId: owner.merchantId,
          invoiceNumber: `E2E-INV-${stamp}-${n}`,
          platformGstNumber: 'PLATFORMGSTIN',
          merchantGstNumber: 'MERCHANTGSTIN',
          taxableAmount: taxable,
          gstRate: 18,
          gstAmount: taxable * 0.18,
          totalAmount: taxable * 1.18,
        },
      });
    };
    const issue = (invoiceId: string, body: Record<string, unknown>) => api.post(`/admin/invoices/${invoiceId}/notes`, adminToken).send(body);

    beforeAll(async () => {
      merchant = await api.registerApprovedMerchant(adminToken);
    });

    it('issues a credit note with GST at the invoice rate, a number, and a PDF the merchant can download', async () => {
      const invoice = await makeInvoice();

      const res = await issue(invoice.id, { type: 'CREDIT', taxableAmount: 400, reason: 'Service fee billed twice' }).expect(201);

      expect(res.body.data).toMatchObject({ type: 'CREDIT', merchantId: merchant.merchantId, issuedBy: expect.any(String) });
      expect(res.body.data.noteNumber).toMatch(/^CN-\d{4}-\d{6}$/);
      expect(Number(res.body.data.gstAmount)).toBe(72);
      expect(Number(res.body.data.totalAmount)).toBe(472);
      expect(res.body.data.pdfPath).toMatch(/\.pdf$/);

      const list = await api.get(`/merchants/${merchant.merchantId}/invoices/notes`, merchant.token).expect(200);
      expect((list.body.data.data as { id: string }[]).map((n) => n.id)).toContain(res.body.data.id);

      const pdf = await api.get(`/merchants/${merchant.merchantId}/invoices/notes/${res.body.data.id}/download`, merchant.token).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('numbers debit notes separately', async () => {
      const invoice = await makeInvoice();
      const res = await issue(invoice.id, { type: 'DEBIT', taxableAmount: 100, reason: 'Extra service month' }).expect(201);
      expect(res.body.data.noteNumber).toMatch(/^DN-\d{4}-\d{6}$/);
    });

    it('refuses a credit above what the invoice is still worth, and says how much is left', async () => {
      const invoice = await makeInvoice();
      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 600, reason: 'Partly billed in error' }).expect(201);

      const res = await issue(invoice.id, { type: 'CREDIT', taxableAmount: 400.01, reason: 'Too much' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/at most ₹400\.00 more/);
      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 400, reason: 'The rest of it' }).expect(201);
      expect(JSON.stringify((await issue(invoice.id, { type: 'CREDIT', taxableAmount: 1, reason: 'One more' })).body)).toMatch(/credited in full/);
    });

    it('lets a debit note raise what can be credited again', async () => {
      const invoice = await makeInvoice();
      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 1000, reason: 'Credited in full' }).expect(201);
      await issue(invoice.id, { type: 'DEBIT', taxableAmount: 250, reason: 'Corrected amount' }).expect(201);

      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 250, reason: 'Credit the correction' }).expect(201);
      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 1, reason: 'Nothing left' }).expect(400);
    });

    it('can not be beaten by several credit notes issued at the same moment', async () => {
      const invoice = await makeInvoice();

      const results = await Promise.all(Array.from({ length: 6 }, () => issue(invoice.id, { type: 'CREDIT', taxableAmount: 300, reason: 'Same moment' })));

      expect(results.filter((r) => r.status === 201)).toHaveLength(3);
      expect(results.filter((r) => r.status === 400)).toHaveLength(3);
      const notes = await prisma.invoiceNote.findMany({ where: { invoiceId: invoice.id } });
      expect(notes.reduce((sum, n) => sum + Number(n.taxableAmount), 0)).toBe(900);
    });

    it('gives every note its own number even when issued at the same moment against different invoices', async () => {
      const invoices = await Promise.all([1, 2, 3, 4].map(() => makeInvoice()));

      const results = await Promise.all(invoices.map((i) => issue(i.id, { type: 'CREDIT', taxableAmount: 100, reason: 'Numbering check' })));

      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      const numbers = results.map((r) => r.body.data.noteNumber as string);
      expect(new Set(numbers).size).toBe(4);
    });

    it('shows the notes on an invoice, oldest first, to the admin', async () => {
      const invoice = await makeInvoice();
      await issue(invoice.id, { type: 'DEBIT', taxableAmount: 10, reason: 'First one' }).expect(201);
      await issue(invoice.id, { type: 'CREDIT', taxableAmount: 20, reason: 'Second one' }).expect(201);

      const res = await api.get(`/admin/invoices/${invoice.id}/notes`, adminToken).expect(200);

      expect((res.body.data as { reason: string }[]).map((n) => n.reason)).toEqual(['First one', 'Second one']);
    });

    it('lists invoices across merchants for the admin', async () => {
      const invoice = await makeInvoice();
      const res = await api.get(`/admin/invoices?merchantId=${merchant.merchantId}&limit=100`, adminToken).expect(200);

      expect((res.body.data.data as { id: string }[]).map((i) => i.id)).toContain(invoice.id);
    });

    describe('who can', () => {
      it('an ordinary user can not issue or list them', async () => {
        const invoice = await makeInvoice();
        const user = await api.registerUser();

        await api.post(`/admin/invoices/${invoice.id}/notes`, user.token).send({ type: 'CREDIT', taxableAmount: 10, reason: 'Nope nope' }).expect(403);
        await api.get(`/admin/invoices/${invoice.id}/notes`, user.token).expect(403);
      });

      it('a merchant can not issue a note against their own invoice', async () => {
        const invoice = await makeInvoice();
        await api.post(`/admin/invoices/${invoice.id}/notes`, merchant.token).send({ type: 'CREDIT', taxableAmount: 10, reason: 'Nope nope' }).expect(403);
        expect(await prisma.invoiceNote.count({ where: { invoiceId: invoice.id } })).toBe(0);
      });

      it('another merchant can not read or download a note that is not theirs', async () => {
        const invoice = await makeInvoice();
        const note = (await issue(invoice.id, { type: 'CREDIT', taxableAmount: 10, reason: 'Private note' }).expect(201)).body.data;
        const other = await api.registerApprovedMerchant(adminToken);

        await api.get(`/merchants/${merchant.merchantId}/invoices/notes`, other.token).expect(403);
        await api.get(`/merchants/${other.merchantId}/invoices/notes/${note.id}/download`, other.token).expect(404);
        const theirs = await api.get(`/merchants/${other.merchantId}/invoices/notes`, other.token).expect(200);
        expect((theirs.body.data.data as { id: string }[]).map((n) => n.id)).not.toContain(note.id);
      });
    });

    describe('what it refuses', () => {
      it.each([
        ['a note with no type', { taxableAmount: 10, reason: 'Missing type' }],
        ['a zero amount', { type: 'CREDIT', taxableAmount: 0, reason: 'Zero amount' }],
        ['a negative amount', { type: 'DEBIT', taxableAmount: -5, reason: 'Negative amount' }],
        ['three decimals', { type: 'DEBIT', taxableAmount: 1.234, reason: 'Three decimals' }],
        ['no reason', { type: 'DEBIT', taxableAmount: 10 }],
        ['a very short reason', { type: 'DEBIT', taxableAmount: 10, reason: 'no' }],
        ['a field that is not part of it', { type: 'DEBIT', taxableAmount: 10, reason: 'Extra field', merchantId: 'x' }],
      ])('%s', async (_label, body) => {
        const invoice = await makeInvoice();
        await issue(invoice.id, body).expect(422);
        expect(await prisma.invoiceNote.count({ where: { invoiceId: invoice.id } })).toBe(0);
      });

      it('an invoice that does not exist', async () => {
        await issue('00000000-0000-4000-8000-000000000000', { type: 'DEBIT', taxableAmount: 10, reason: 'No such invoice' }).expect(404);
      });
    });
  });
});
