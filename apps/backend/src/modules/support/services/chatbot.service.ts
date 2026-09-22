import { Injectable, Logger } from '@nestjs/common';
import { SupportCategory, SupportPriority } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import {
  CATEGORY_RULES,
  CHATBOT_LIMITS,
  CHATBOT_REPLIES,
  ChatConfidence,
  ChatIntent,
  ChatRole,
  INTENT_RULES,
  KNOWLEDGE,
  KnowledgeSourceKind,
  URGENT_PATTERN,
} from '../constants/chatbot.constants';
import { ChatbotHandoffDto, ChatbotMessageDto } from '../dto/chatbot.dto';
import { ChatbotReply, KnowledgeMatch } from '../interfaces';
import { truncateAtSentence } from '../utils';

import { KnowledgeBaseService } from './knowledge-base.service';
import { SupportService } from './support.service';

/**
 * The help assistant: answers questions from the FAQ and help pages, and hands the person to the support team
 * whenever it cannot help.
 *
 * WHY it only quotes and never writes its own answers: it cannot see accounts, payments or policies, so
 * anything it made up about them could be wrong in a way that costs someone money. Every answer is text an
 * admin wrote, with its source shown. When it is unsure, or the question is about the person's own account,
 * it says so and offers a human instead of guessing.
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly supportService: SupportService,
  ) {}

  async reply(dto: ChatbotMessageDto): Promise<ChatbotReply> {
    const intent = this.detectIntent(dto.message);
    const suggestedCategory = this.detectCategory(dto.message);
    const base = { intent, suggestedCategory, sources: [] };

    if (intent === ChatIntent.GREETING) {
      return { ...base, reply: CHATBOT_REPLIES.greeting, confidence: ChatConfidence.NONE, suggestHandoff: false };
    }
    if (intent === ChatIntent.THANKS) {
      return { ...base, reply: CHATBOT_REPLIES.thanks, confidence: ChatConfidence.NONE, suggestHandoff: false };
    }
    if (intent === ChatIntent.HUMAN_REQUEST) {
      return { ...base, reply: CHATBOT_REPLIES.humanRequest, confidence: ChatConfidence.NONE, suggestHandoff: true };
    }

    const result = await this.knowledgeBase.search(dto.message);
    // Only lengths and outcomes are logged: what people type can include personal details.
    this.logger.log(`Chatbot question answered: intent=${intent} confidence=${result.confidence} matches=${result.matches.length}`);

    if (!result.available) {
      return { ...base, reply: CHATBOT_REPLIES.unavailable, confidence: ChatConfidence.NONE, suggestHandoff: true };
    }

    const top = result.matches[0];
    if (!top) {
      const reply = intent === ChatIntent.ACCOUNT_ISSUE ? CHATBOT_REPLIES.accountIssue : CHATBOT_REPLIES.noAnswer;
      return { ...base, reply, confidence: ChatConfidence.NONE, suggestHandoff: true };
    }

    const answer = this.formatAnswer(top);
    // A question about the person's own account can be partly answered by general help, but it is never
    // settled by it, so a human is always offered.
    const isAccountIssue = intent === ChatIntent.ACCOUNT_ISSUE;
    const lead = result.confidence === ChatConfidence.LOW ? `${CHATBOT_REPLIES.lowConfidence}\n\n` : '';
    const tail = isAccountIssue ? `\n\n${CHATBOT_REPLIES.accountIssue}` : '';

    return {
      ...base,
      reply: `${lead}${answer}${tail}`,
      confidence: result.confidence,
      suggestHandoff: isAccountIssue || result.confidence !== ChatConfidence.HIGH,
      sources: result.matches.map(({ doc }) => ({ kind: doc.kind, id: doc.id, title: doc.title })),
    };
  }

  /** Turns the conversation into a support ticket, so the person does not have to explain it all again. */
  async handoff(userId: string, dto: ChatbotHandoffDto) {
    const userMessages = dto.messages.filter((m) => m.role === ChatRole.USER).map((m) => m.text);
    if (!userMessages.length) {
      throw new BadRequestException('Add at least one message from you before asking for a person');
    }

    const everythingSaid = userMessages.join('\n');
    const category = dto.category ?? this.detectCategory(everythingSaid);
    const priority = URGENT_PATTERN.test(everythingSaid) ? SupportPriority.HIGH : SupportPriority.MEDIUM;

    const ticket = await this.supportService.createAsUser(userId, {
      subject: this.buildSubject(userMessages[0]),
      description: this.buildTranscript(dto),
      category,
      priority,
    });

    this.logger.log(`Chat handed to support: category=${category} priority=${priority} messages=${dto.messages.length}`);
    return ticket;
  }

  private detectIntent(message: string): ChatIntent {
    return INTENT_RULES.find((rule) => rule.pattern.test(message))?.intent ?? ChatIntent.QUESTION;
  }

  private detectCategory(text: string): SupportCategory {
    return CATEGORY_RULES.find((rule) => rule.pattern.test(text))?.category ?? SupportCategory.GENERAL;
  }

  /** A help page is named so the person knows where the text came from; a FAQ answer stands on its own. */
  private formatAnswer({ doc }: KnowledgeMatch): string {
    const text = truncateAtSentence(doc.body, KNOWLEDGE.maxAnswerChars);
    return doc.kind === KnowledgeSourceKind.PAGE ? `From "${doc.title}":\n${text}` : text;
  }

  private buildSubject(firstMessage: string): string {
    const oneLine = firstMessage.replace(/\s+/g, ' ').trim().slice(0, CHATBOT_LIMITS.subjectMaxLength);
    return oneLine.length >= 5 ? oneLine : CHATBOT_REPLIES.ticketSubject;
  }

  private buildTranscript(dto: ChatbotHandoffDto): string {
    const lines = dto.messages.map((m) => `${m.role === ChatRole.USER ? 'User' : 'Assistant'}: ${m.text}`);
    return `Conversation with the help assistant, oldest first:\n\n${lines.join('\n')}`;
  }
}
