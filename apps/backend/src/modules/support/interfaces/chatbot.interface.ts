import { SupportCategory } from '@prisma/client';

import { ChatConfidence, ChatIntent, KnowledgeSourceKind } from '../constants/chatbot.constants';

/** One searchable piece of help content: a whole FAQ, or one part of a CMS page. */
export interface KnowledgeDoc {
  kind: KnowledgeSourceKind;
  id: string;
  /** The FAQ question, or the page title. */
  title: string;
  /** The FAQ answer, or the part of the page. Plain text. */
  body: string;
}

export interface KnowledgeMatch {
  doc: KnowledgeDoc;
  score: number;
}

export interface KnowledgeSearchResult {
  /** False when there is no help content at all, so "no answer" can be told apart from "nothing to search". */
  available: boolean;
  confidence: ChatConfidence;
  matches: KnowledgeMatch[];
}

export interface ChatbotSource {
  kind: KnowledgeSourceKind;
  id: string;
  title: string;
}

export interface ChatbotReply {
  reply: string;
  intent: ChatIntent;
  confidence: ChatConfidence;
  /** The app shows "Talk to a person" prominently when this is true. */
  suggestHandoff: boolean;
  /** Pre-fills the category if the person hands over. */
  suggestedCategory: SupportCategory;
  sources: ChatbotSource[];
}
