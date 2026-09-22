import { HELP_FAQS, HELP_PAGES } from '../../../../prisma/seed-data/help-content';
import { REFERRAL_CONSTANTS } from '../../referral/constants';
import { WALLET_CONSTANTS } from '../../wallet/constants';
import { ChatConfidence } from '../constants/chatbot.constants';

import { KnowledgeBaseService } from './knowledge-base.service';

/**
 * The seeded help content is what the support chatbot answers from, so it is tested the way the chatbot uses it:
 * real questions in, the right answer out. It also checks the numbers in the answers are the numbers the rules use.
 */
describe('seeded help content', () => {
  describe('the content itself', () => {
    it('has no empty questions or answers', () => {
      for (const faq of HELP_FAQS) {
        expect(faq.question.trim().length).toBeGreaterThan(10);
        expect(faq.answer.trim().length).toBeGreaterThan(20);
        expect(faq.category.trim()).not.toBe('');
      }
    });

    it('has no question twice, since the seed matches on category and question', () => {
      const keys = HELP_FAQS.map((faq) => `${faq.category}|${faq.question}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('covers each topic a user asks about', () => {
      const categories = new Set(HELP_FAQS.map((faq) => faq.category));
      for (const topic of ['Reviews & Honest Feedback', 'Payments', 'KYC', 'Rejected Submissions', 'Referrals', 'Campaigns']) {
        expect(categories).toContain(topic);
      }
    });

    it('takes the withdrawal and referral amounts from the rules, not from typed-in copies', () => {
      const answer = (question: string) => HELP_FAQS.find((faq) => faq.question === question)?.answer ?? '';

      expect(answer('What is the minimum withdrawal amount?')).toContain(`₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`);
      expect(answer('How does the referral bonus work?')).toContain(`₹${REFERRAL_CONSTANTS.SIGNUP_BONUS_AMOUNT}`);
      expect(answer('How do I withdraw my earnings?')).toContain(`${WALLET_CONSTANTS.MAX_BANK_ACCOUNTS} bank accounts`);
      expect(HELP_PAGES[0].content).toContain(`₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`);
    });

    it('replaces the old wrong minimum withdrawal answer', () => {
      const minimum = HELP_FAQS.find((faq) => faq.question === 'What is the minimum withdrawal amount?');
      expect(minimum?.replacesAnswers).toContain('The minimum withdrawal amount is ₹100.');
      expect(minimum?.answer).not.toContain('₹100.');
    });

    it('says plainly that rewards never depend on the rating', () => {
      const rating = HELP_FAQS.find((faq) => faq.question.startsWith('Do I have to give 5 stars'));

      expect(rating?.answer).toMatch(/never depends on the rating/i);
      expect(rating?.answer).toMatch(/good or bad/i);
      expect(HELP_PAGES[0].content).toMatch(/never depends on the rating/i);
    });

    it('never promises a reward for a rating or asks the user to leave a positive one', () => {
      const everything = [...HELP_FAQS.map((faq) => faq.answer), ...HELP_PAGES.map((page) => page.content)].join(' ');

      expect(everything).not.toMatch(/(?:earn|get|receive|paid)[^.]{0,40}(?:for|with)[^.]{0,20}(?:5|five)[- ]?stars?/i);
      expect(everything).not.toMatch(/leave a (?:good|positive|5[- ]star)/i);
    });
  });

  describe('answering real questions', () => {
    const prisma = { fAQ: { findMany: jest.fn() }, cMSPage: { findMany: jest.fn() } };
    let service: KnowledgeBaseService;

    beforeEach(() => {
      jest.resetAllMocks();
      prisma.fAQ.findMany.mockResolvedValue(HELP_FAQS.map((faq, index) => ({ id: `faq-${index}`, question: faq.question, answer: faq.answer })));
      prisma.cMSPage.findMany.mockResolvedValue(HELP_PAGES.map((page, index) => ({ id: `page-${index}`, title: page.title, content: page.content })));
      service = new KnowledgeBaseService(prisma as never);
    });

    it.each([
      ['Do I need to give 5 stars to get paid?', 'Do I have to give 5 stars, a good rating or a positive review to get my reward?'],
      ['can I post a bad review and still get my reward', 'Can I write a bad, negative or mixed review and still get my reward?'],
      ['a shop owner asked me to give 5 stars', 'A business asked me for 5 stars or a positive review. What should I do?'],
      ['what is the minimum amount I can withdraw', 'What is the minimum withdrawal amount?'],
      ['why is my withdrawal under review', 'Why is my withdrawal under review?'],
      ['my withdrawal was rejected where is my money', 'What happens to my money if a withdrawal is rejected?'],
      ['how do I verify my PAN', 'How do I verify my PAN? Where do I upload it?'],
      ['why was my submission rejected', 'Why was my submission rejected?'],
      ['can I submit again after rejection', 'Can I submit again or try again after my submission is rejected?'],
      ['when do I get my reward', 'When do I get my reward?'],
      ['how does the referral bonus work', 'How does the referral bonus work?'],
      ['I forgot my password', 'I forgot my password. How do I reset it?'],
    ])('answers "%s" from the right FAQ', async (question, expectedFaq) => {
      const result = await service.search(question);

      expect(result.confidence).not.toBe(ChatConfidence.NONE);
      expect(result.matches[0].doc.title).toBe(expectedFaq);
    });

    it('is confident when the question matches a FAQ closely', async () => {
      expect((await service.search('How do I verify my PAN? Where do I upload it?')).confidence).toBe(ChatConfidence.HIGH);
    });

    it('finds the honest-feedback page for a question about what the rules allow', async () => {
      const result = await service.search('what campaign wording is not allowed');

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.map((match) => match.doc.title)).toContain('Honest feedback and your rewards');
    });
  });
});
