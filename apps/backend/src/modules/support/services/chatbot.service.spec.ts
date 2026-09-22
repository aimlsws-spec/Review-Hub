import { SupportCategory, SupportPriority } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CHATBOT_REPLIES, ChatConfidence, ChatIntent, ChatRole, KnowledgeSourceKind } from '../constants/chatbot.constants';
import { ChatbotHandoffDto } from '../dto/chatbot.dto';

import { ChatbotService } from './chatbot.service';

const faqMatch = (body = 'Open Wallet, tap Withdraw and choose a bank account.') => ({
  doc: { kind: KnowledgeSourceKind.FAQ, id: 'f1', title: 'How do I withdraw?', body },
  score: 3,
});
const pageMatch = { doc: { kind: KnowledgeSourceKind.PAGE, id: 'p1', title: 'Referral programme', body: 'Invite friends.' }, score: 2 };

describe('ChatbotService', () => {
  const knowledgeBase = { search: jest.fn() };
  const supportService = { createAsUser: jest.fn() };
  let service: ChatbotService;

  const found = (confidence: ChatConfidence, matches = [faqMatch()]) =>
    knowledgeBase.search.mockResolvedValue({ available: true, confidence, matches });

  beforeEach(() => {
    jest.resetAllMocks();
    supportService.createAsUser.mockResolvedValue({ id: 'ticket-1' });
    service = new ChatbotService(knowledgeBase as never, supportService as never);
  });

  describe('reply', () => {
    it('answers a well matched question with the FAQ answer and its source', async () => {
      found(ChatConfidence.HIGH);

      const result = await service.reply({ message: 'How do I withdraw?' });

      expect(result.reply).toBe('Open Wallet, tap Withdraw and choose a bank account.');
      expect(result.confidence).toBe(ChatConfidence.HIGH);
      expect(result.suggestHandoff).toBe(false);
      expect(result.sources).toEqual([{ kind: KnowledgeSourceKind.FAQ, id: 'f1', title: 'How do I withdraw?' }]);
    });

    it('names the help page an answer comes from', async () => {
      found(ChatConfidence.HIGH, [pageMatch]);

      const result = await service.reply({ message: 'How does referral work?' });

      expect(result.reply).toBe('From "Referral programme":\nInvite friends.');
    });

    it('admits when it is not sure and offers a person', async () => {
      found(ChatConfidence.LOW);

      const result = await service.reply({ message: 'withdraw something odd' });

      expect(result.reply.startsWith(CHATBOT_REPLIES.lowConfidence)).toBe(true);
      expect(result.suggestHandoff).toBe(true);
    });

    it('says it could not find an answer and offers a person', async () => {
      knowledgeBase.search.mockResolvedValue({ available: true, confidence: ChatConfidence.NONE, matches: [] });

      const result = await service.reply({ message: 'what is the weather' });

      expect(result.reply).toBe(CHATBOT_REPLIES.noAnswer);
      expect(result.confidence).toBe(ChatConfidence.NONE);
      expect(result.suggestHandoff).toBe(true);
      expect(result.sources).toEqual([]);
    });

    it('offers a person when there is no help content at all', async () => {
      knowledgeBase.search.mockResolvedValue({ available: false, confidence: ChatConfidence.NONE, matches: [] });

      const result = await service.reply({ message: 'anything' });

      expect(result.reply).toBe(CHATBOT_REPLIES.unavailable);
      expect(result.suggestHandoff).toBe(true);
    });

    it('never quotes an answer as final for a problem on the person own account', async () => {
      found(ChatConfidence.HIGH);

      const result = await service.reply({ message: 'my withdrawal is stuck for 5 days' });

      expect(result.intent).toBe(ChatIntent.ACCOUNT_ISSUE);
      expect(result.reply).toContain('Open Wallet');
      expect(result.reply).toContain(CHATBOT_REPLIES.accountIssue);
      expect(result.suggestHandoff).toBe(true);
    });

    it('tells the person it cannot check their account when nothing matches an account problem', async () => {
      knowledgeBase.search.mockResolvedValue({ available: true, confidence: ChatConfidence.NONE, matches: [] });

      const result = await service.reply({ message: 'money was deducted but nothing came' });

      expect(result.reply).toBe(CHATBOT_REPLIES.accountIssue);
      expect(result.suggestHandoff).toBe(true);
    });

    it.each(['hi', 'Hello!', 'good morning', 'namaste'])('greets back without searching for "%s"', async (message) => {
      const result = await service.reply({ message });

      expect(result.intent).toBe(ChatIntent.GREETING);
      expect(result.reply).toBe(CHATBOT_REPLIES.greeting);
      expect(knowledgeBase.search).not.toHaveBeenCalled();
    });

    it('does not treat a question that starts with a greeting as only a greeting', async () => {
      found(ChatConfidence.HIGH);

      const result = await service.reply({ message: 'hi how do I withdraw' });

      expect(result.intent).toBe(ChatIntent.QUESTION);
      expect(knowledgeBase.search).toHaveBeenCalled();
    });

    it('replies to thanks without searching', async () => {
      const result = await service.reply({ message: 'thank you' });

      expect(result.intent).toBe(ChatIntent.THANKS);
      expect(knowledgeBase.search).not.toHaveBeenCalled();
    });

    it.each(['I want to talk to a person', 'connect me to customer support', 'human please', 'call me'])(
      'goes straight to a person when asked: "%s"',
      async (message) => {
        const result = await service.reply({ message });

        expect(result.intent).toBe(ChatIntent.HUMAN_REQUEST);
        expect(result.suggestHandoff).toBe(true);
        expect(knowledgeBase.search).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['how do I withdraw money to my bank', SupportCategory.WITHDRAWAL],
      ['I was charged but payment failed', SupportCategory.PAYMENT],
      ['where are my reward points', SupportCategory.REWARD],
      ['how to submit proof for a task', SupportCategory.CAMPAIGN],
      ['I cannot login with my otp', SupportCategory.ACCOUNT],
      ['the app keeps crashing', SupportCategory.BUG],
      ['tell me about your company', SupportCategory.GENERAL],
    ])('suggests a category for "%s"', async (message, category) => {
      found(ChatConfidence.HIGH);

      const result = await service.reply({ message });

      expect(result.suggestedCategory).toBe(category);
    });

    it('cuts a very long answer at the end of a sentence', async () => {
      found(ChatConfidence.HIGH, [faqMatch(`${'This is a sentence. '.repeat(60)}`)]);

      const result = await service.reply({ message: 'long one' });

      expect(result.reply.length).toBeLessThanOrEqual(700);
      expect(result.reply.endsWith('.')).toBe(true);
    });
  });

  describe('handoff', () => {
    const dto = (messages: { role: ChatRole; text: string }[], category?: SupportCategory) =>
      ({ messages, category }) as ChatbotHandoffDto;

    it('turns the conversation into a support ticket owned by the user', async () => {
      const result = await service.handoff(
        'user-1',
        dto([
          { role: ChatRole.USER, text: 'How do I withdraw?' },
          { role: ChatRole.BOT, text: 'Open Wallet and tap Withdraw.' },
          { role: ChatRole.USER, text: 'It says my bank is not verified' },
        ]),
      );

      expect(result).toEqual({ id: 'ticket-1' });
      expect(supportService.createAsUser).toHaveBeenCalledWith('user-1', {
        subject: 'How do I withdraw?',
        description:
          'Conversation with the help assistant, oldest first:\n\nUser: How do I withdraw?\nAssistant: Open Wallet and tap Withdraw.\nUser: It says my bank is not verified',
        category: SupportCategory.WITHDRAWAL,
        priority: SupportPriority.MEDIUM,
      });
    });

    it('uses the category the person chose over the one it worked out', async () => {
      await service.handoff('user-1', dto([{ role: ChatRole.USER, text: 'How do I withdraw?' }], SupportCategory.BUG));

      expect(supportService.createAsUser.mock.calls[0][1].category).toBe(SupportCategory.BUG);
    });

    it('marks money and safety problems as high priority', async () => {
      await service.handoff('user-1', dto([{ role: ChatRole.USER, text: 'Money was deducted twice from my wallet' }]));

      expect(supportService.createAsUser.mock.calls[0][1].priority).toBe(SupportPriority.HIGH);
    });

    it('refuses a conversation where the user said nothing', async () => {
      await expect(service.handoff('user-1', dto([{ role: ChatRole.BOT, text: 'Hi!' }]))).rejects.toBeInstanceOf(BadRequestException);
      expect(supportService.createAsUser).not.toHaveBeenCalled();
    });

    it('gives a ticket a usable subject when the first message is very short', async () => {
      await service.handoff('user-1', dto([{ role: ChatRole.USER, text: 'help' }]));

      expect(supportService.createAsUser.mock.calls[0][1].subject).toBe(CHATBOT_REPLIES.ticketSubject);
    });

    it('keeps the subject to one line and within the limit', async () => {
      await service.handoff('user-1', dto([{ role: ChatRole.USER, text: `line one\nline two ${'x'.repeat(300)}` }]));

      const { subject } = supportService.createAsUser.mock.calls[0][1];
      expect(subject).not.toContain('\n');
      expect(subject.length).toBeLessThanOrEqual(100);
    });
  });
});
