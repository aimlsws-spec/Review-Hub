import { Test, TestingModule } from '@nestjs/testing';

import { ChatbotService } from '../services/chatbot.service';

import { ChatbotController } from './chatbot.controller';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  const chatbotService = { reply: jest.fn(), handoff: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [{ provide: ChatbotService, useValue: chatbotService }],
    }).compile();

    controller = module.get(ChatbotController);
    jest.clearAllMocks();
  });

  it('passes a question to the assistant', async () => {
    const dto = { message: 'How do I withdraw?' };
    await controller.message(dto);
    expect(chatbotService.reply).toHaveBeenCalledWith(dto);
  });

  it('hands the chat over for the signed-in user', async () => {
    const dto = { messages: [] };
    await controller.handoff('user-1', dto as never);
    expect(chatbotService.handoff).toHaveBeenCalledWith('user-1', dto);
  });

  it('limits handing over much more tightly than asking', () => {
    const limit = (name: 'message' | 'handoff') =>
      Reflect.getMetadata('THROTTLER:LIMITdefault', ChatbotController.prototype[name]) as number;

    expect(limit('message')).toBe(30);
    expect(limit('handoff')).toBe(5);
  });
});
