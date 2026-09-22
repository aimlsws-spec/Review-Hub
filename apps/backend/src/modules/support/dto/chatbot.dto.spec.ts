import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ChatRole } from '../constants/chatbot.constants';

import { ChatbotHandoffDto, ChatbotMessageDto } from './chatbot.dto';

const errorsFor = async <T extends object>(cls: new () => T, input: Record<string, unknown>) =>
  validate(plainToInstance(cls, input));

describe('ChatbotMessageDto', () => {
  it('accepts a normal question and trims it', async () => {
    const dto = plainToInstance(ChatbotMessageDto, { message: '  How do I withdraw?  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.message).toBe('How do I withdraw?');
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['too long', 'x'.repeat(501)],
    ['not text', 42],
  ])('rejects a message that is %s', async (_name, message) => {
    expect((await errorsFor(ChatbotMessageDto, { message })).length).toBeGreaterThan(0);
  });
});

describe('ChatbotHandoffDto', () => {
  const ok = { messages: [{ role: ChatRole.USER, text: 'Help me' }] };

  it('accepts a conversation', async () => {
    expect(await errorsFor(ChatbotHandoffDto, ok)).toHaveLength(0);
  });

  it.each([
    ['no messages', { messages: [] }],
    ['messages missing', {}],
    ['too many messages', { messages: Array.from({ length: 21 }, () => ({ role: ChatRole.USER, text: 'x' })) }],
    ['an unknown role', { messages: [{ role: 'ADMIN', text: 'x' }] }],
    ['an empty message', { messages: [{ role: ChatRole.USER, text: ' ' }] }],
    ['a message that is too long', { messages: [{ role: ChatRole.USER, text: 'x'.repeat(1001) }] }],
    ['an unknown category', { ...ok, category: 'NOPE' }],
  ])('rejects %s', async (_name, input) => {
    expect((await errorsFor(ChatbotHandoffDto, input)).length).toBeGreaterThan(0);
  });
});
