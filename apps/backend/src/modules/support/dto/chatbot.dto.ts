import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { CHATBOT_LIMITS, ChatRole } from '../constants/chatbot.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** One question typed into the chat assistant. */
export class ChatbotMessageDto {
  @ApiProperty({ example: 'How do I withdraw my rewards?' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHATBOT_LIMITS.messageMaxLength)
  message!: string;
}

export class ChatTranscriptMessageDto {
  @ApiProperty({ enum: ChatRole })
  @IsEnum(ChatRole)
  role!: ChatRole;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHATBOT_LIMITS.transcriptMessageMaxLength)
  text!: string;
}

/** Hands a chat over to the support team: the conversation so far becomes a support ticket. */
export class ChatbotHandoffDto {
  @ApiProperty({ type: [ChatTranscriptMessageDto], description: 'The conversation so far, oldest first' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CHATBOT_LIMITS.transcriptMaxMessages)
  @ValidateNested({ each: true })
  @Type(() => ChatTranscriptMessageDto)
  messages!: ChatTranscriptMessageDto[];

  @ApiPropertyOptional({ enum: SupportCategory, description: 'Worked out from the conversation when left out' })
  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;
}
