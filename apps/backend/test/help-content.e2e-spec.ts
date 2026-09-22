import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { WALLET_CONSTANTS } from '../src/modules/wallet/constants';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/**
 * The help content the seed puts in the database, and the chatbot that answers from it. The seed runs against the
 * throwaway test database only (the safety checks in global setup refuse anything else).
 */
describe('Help content (e2e)', () => {
  let app: INestApplication;
  let api: Api;
  let prisma: PrismaService;
  let token: string;

  const MINIMUM_QUESTION = 'What is the minimum withdrawal amount?';

  // Not execSync: it would freeze this process while the seed runs, and the app's own connections need it awake.
  const reseed = async () => {
    await promisify(exec)('npx ts-node --transpile-only prisma/seed.ts', { cwd: path.resolve(__dirname, '..'), env: process.env });
  };

  const ask = async (message: string) => (await api.post('/support/chatbot/message', token).send({ message }).expect(200)).body.data;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);
    prisma = app.get(PrismaService);
    token = (await api.registerUser()).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeds the help topics people ask about', async () => {
    const categories = (await prisma.fAQ.findMany({ where: { deletedAt: null }, distinct: ['category'], select: { category: true } })).map((f) => f.category);

    expect(categories).toEqual(expect.arrayContaining(['Reviews & Honest Feedback', 'Payments', 'KYC', 'Rejected Submissions', 'Referrals']));
    expect(await prisma.cMSPage.findFirst({ where: { slug: 'honest-feedback', status: 'PUBLISHED' } })).not.toBeNull();
  });

  it('the chatbot tells someone their reward does not depend on the rating', async () => {
    const reply = await ask('Do I need to give 5 stars to get paid?');

    expect(reply.reply).toMatch(/never depends on the rating/i);
    expect(reply.sources[0].title).toMatch(/5 stars/);
  });

  it('the chatbot gives the real minimum withdrawal, the one the withdrawal rule enforces', async () => {
    const reply = await ask('what is the minimum amount I can withdraw');

    expect(reply.reply).toContain(`₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`);
    expect(reply.reply).not.toContain('₹100.');
  });

  it('the chatbot explains why a submission is rejected without blaming the rating', async () => {
    const reply = await ask('why was my submission rejected');

    expect(reply.reply).toMatch(/never rejected because of your rating/i);
  });

  describe('seeding again', () => {
    it('adds nothing twice', async () => {
      const before = await prisma.fAQ.count({ where: { deletedAt: null } });

      await reseed();

      expect(await prisma.fAQ.count({ where: { deletedAt: null } })).toBe(before);
      expect(await prisma.cMSPage.count({ where: { slug: 'honest-feedback' } })).toBe(1);
    });

    it('corrects the old wrong minimum, but only while it is still exactly the old text', async () => {
      const row = await prisma.fAQ.findFirstOrThrow({ where: { question: MINIMUM_QUESTION, deletedAt: null } });

      await prisma.fAQ.update({ where: { id: row.id }, data: { answer: 'The minimum withdrawal amount is ₹100.' } });
      await reseed();
      expect((await prisma.fAQ.findUniqueOrThrow({ where: { id: row.id } })).answer).toContain(`₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`);
    });

    it('never overwrites an answer an admin has written', async () => {
      const row = await prisma.fAQ.findFirstOrThrow({ where: { question: MINIMUM_QUESTION, deletedAt: null } });
      const adminText = 'Our admin wrote this answer themselves.';

      await prisma.fAQ.update({ where: { id: row.id }, data: { answer: adminText } });
      await reseed();
      expect((await prisma.fAQ.findUniqueOrThrow({ where: { id: row.id } })).answer).toBe(adminText);

      // Put the seeded wording back so later runs and other files see the normal content.
      await prisma.fAQ.update({ where: { id: row.id }, data: { answer: `The minimum withdrawal amount is ₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}.` } });
    });

    it('does not bring back a FAQ an admin deleted', async () => {
      const question = 'Can I use more than one account?';
      const row = await prisma.fAQ.findFirstOrThrow({ where: { question, deletedAt: null } });

      await prisma.fAQ.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
      await reseed();

      expect(await prisma.fAQ.count({ where: { question, deletedAt: null } })).toBe(0);

      // Restore it so later runs and other files see the normal content.
      await prisma.fAQ.update({ where: { id: row.id }, data: { deletedAt: null } });
    });
  });
});
