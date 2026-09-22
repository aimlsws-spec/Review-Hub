import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { ChatbotHandoffDto, ChatbotMessageDto } from '../dto/chatbot.dto';
import { ChatbotService } from '../services/chatbot.service';

/** Asking is cheap, so it is generous. Handing over creates a ticket someone has to read, so it is not. */
const ASK_RATE_LIMIT = { default: { limit: 30, ttl: 60_000 } };
const HANDOFF_RATE_LIMIT = { default: { limit: 5, ttl: 10 * 60_000 } };

@ApiTags(SWAGGER_TAGS.SUPPORT)
@Controller({ path: 'support/chatbot', version: '1' })
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @Throttle(ASK_RATE_LIMIT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask the help assistant a question. It answers from the FAQ and help pages.' })
  async message(@Body() dto: ChatbotMessageDto) {
    return this.chatbotService.reply(dto);
  }

  @Post('handoff')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(HANDOFF_RATE_LIMIT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hand the chat over to the support team; the conversation becomes a support ticket' })
  async handoff(@CurrentUser('id') userId: string, @Body() dto: ChatbotHandoffDto) {
    return this.chatbotService.handoff(userId, dto);
  }
}
