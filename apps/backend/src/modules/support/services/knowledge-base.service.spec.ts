import { ChatConfidence, KNOWLEDGE, KnowledgeSourceKind } from '../constants/chatbot.constants';

import { KnowledgeBaseService } from './knowledge-base.service';

const faqs = [
  { id: 'f1', question: 'How do I withdraw my rewards to my bank account?', answer: '<p>Open Wallet, tap Withdraw and choose a verified bank account. Withdrawals reach you in 1 to 3 working days.</p>' },
  { id: 'f2', question: 'How do I complete a task?', answer: 'Open the campaign, tap Start task, do the task and upload a screenshot as proof.' },
  { id: 'f3', question: 'Why was my submission rejected?', answer: 'A submission is rejected when the proof does not match the task or was already used before.' },
  { id: 'f4', question: 'How do I verify my KYC?', answer: 'Go to Profile, tap KYC and upload your PAN card and a selfie.' },
  { id: 'f5', question: 'What is the minimum withdrawal amount?', answer: 'You can withdraw once your balance reaches Rs 100.' },
];
const pages = [
  {
    id: 'p1',
    title: 'Referral programme',
    content: '<p>Invite friends with your referral code.</p><p>You earn a bonus when your friend completes their first task.</p>',
  },
];

describe('KnowledgeBaseService', () => {
  const prisma = { fAQ: { findMany: jest.fn() }, cMSPage: { findMany: jest.fn() } };
  let service: KnowledgeBaseService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.fAQ.findMany.mockResolvedValue(faqs);
    prisma.cMSPage.findMany.mockResolvedValue(pages);
    service = new KnowledgeBaseService(prisma as never);
  });

  it.each([
    ['How can I withdraw money to my bank?', 'f1'],
    ['how to complete a task', 'f2'],
    ['why did my submission get rejected', 'f3'],
    ['KYC verification', 'f4'],
    ['minimum amount to withdraw', 'f5'],
    ['payout to bank account', 'f1'],
  ])('finds the right FAQ for "%s"', async (question, expectedId) => {
    const result = await service.search(question);

    expect(result.matches[0].doc.id).toBe(expectedId);
    expect(result.confidence).not.toBe(ChatConfidence.NONE);
  });

  it('is highly confident when the question is well covered', async () => {
    const result = await service.search('How do I verify my KYC?');
    expect(result.confidence).toBe(ChatConfidence.HIGH);
  });

  it('finds an answer inside a CMS page and names the page', async () => {
    const result = await service.search('How does the referral code bonus work?');

    expect(result.matches[0].doc).toMatchObject({ kind: KnowledgeSourceKind.PAGE, id: 'p1', title: 'Referral programme' });
  });

  it('strips HTML from answers', async () => {
    const result = await service.search('withdraw to bank account');
    expect(result.matches[0].doc.body).not.toMatch(/<\/?p>/);
  });

  it('says there is no answer for something the help content does not cover', async () => {
    const result = await service.search('what is the weather in Mumbai today');

    expect(result.confidence).toBe(ChatConfidence.NONE);
    expect(result.matches).toEqual([]);
    expect(result.available).toBe(true);
  });

  it('is only partly confident when little of the question is covered', async () => {
    const result = await service.search('withdraw pineapple pizza shipping invoice');

    expect(result.confidence).not.toBe(ChatConfidence.HIGH);
  });

  it('says nothing to search when there is no help content at all', async () => {
    prisma.fAQ.findMany.mockResolvedValue([]);
    prisma.cMSPage.findMany.mockResolvedValue([]);

    const result = await service.search('anything');

    expect(result.available).toBe(false);
    expect(result.confidence).toBe(ChatConfidence.NONE);
  });

  it('gives no answer for a question with no meaningful words', async () => {
    const result = await service.search('how do i');
    expect(result.confidence).toBe(ChatConfidence.NONE);
  });

  it('returns at most the configured number of sources', async () => {
    const result = await service.search('withdraw task submission kyc referral');
    expect(result.matches.length).toBeLessThanOrEqual(KNOWLEDGE.maxSources);
  });

  it('only reads active FAQs and published pages that are not deleted', async () => {
    await service.search('withdraw');

    expect(prisma.fAQ.findMany.mock.calls[0][0].where).toEqual({ isActive: true, deletedAt: null });
    expect(prisma.cMSPage.findMany.mock.calls[0][0].where).toEqual({ status: 'PUBLISHED', deletedAt: null });
  });

  it('reuses the index between questions, then rebuilds it once it is stale or invalidated', async () => {
    await service.search('withdraw');
    await service.search('kyc');
    expect(prisma.fAQ.findMany).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.search('kyc');
    expect(prisma.fAQ.findMany).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + KNOWLEDGE.cacheTtlMs + 1000);
    await service.search('kyc');
    expect(prisma.fAQ.findMany).toHaveBeenCalledTimes(3);
    jest.restoreAllMocks();
  });

  it('builds the index once when several questions arrive together', async () => {
    await Promise.all([service.search('withdraw'), service.search('kyc'), service.search('task')]);
    expect(prisma.fAQ.findMany).toHaveBeenCalledTimes(1);
  });

  it('can build again after a failed build', async () => {
    prisma.fAQ.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(service.search('withdraw')).rejects.toThrow('db down');

    prisma.fAQ.findMany.mockResolvedValue(faqs);
    await expect(service.search('withdraw')).resolves.toMatchObject({ available: true });
  });
});
