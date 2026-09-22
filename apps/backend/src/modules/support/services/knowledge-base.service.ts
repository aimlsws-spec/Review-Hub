import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { ChatConfidence, KNOWLEDGE, KnowledgeSourceKind } from '../constants/chatbot.constants';
import { KnowledgeDoc, KnowledgeSearchResult } from '../interfaces';
import { Bm25Index, chunkText, stripHtml, tokenize } from '../utils';

interface BuiltIndex {
  builtAt: number;
  docs: KnowledgeDoc[];
  index: Bm25Index;
}

/**
 * Searches the help content the admins already maintain: active FAQs and published CMS pages.
 *
 * WHY it is rebuilt from the database and not stored: the FAQ and pages stay the single source of truth, so
 * an edit is picked up without a separate sync job. The index is only a cache held in memory for a few
 * minutes; nothing in it is permanent data.
 */
@Injectable()
export class KnowledgeBaseService {
  private built: BuiltIndex | null = null;
  private loading: Promise<BuiltIndex> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Finds the pieces of help content that best match a question, and how sure the match is. */
  async search(question: string): Promise<KnowledgeSearchResult> {
    const { docs, index } = await this.getIndex();
    if (!docs.length) return { available: false, confidence: ChatConfidence.NONE, matches: [] };

    const queryTokens = [...new Set(tokenize(question))];
    if (!queryTokens.length) return { available: true, confidence: ChatConfidence.NONE, matches: [] };

    const hits = index.search(queryTokens, KNOWLEDGE.maxSources);
    if (!hits.length) return { available: true, confidence: ChatConfidence.NONE, matches: [] };

    // How much of the question the best answer covers matters more than the raw score, which depends on how
    // large the help content happens to be.
    const coverage = hits[0].matched / queryTokens.length;
    const confidence =
      coverage >= KNOWLEDGE.highCoverage ? ChatConfidence.HIGH : coverage >= KNOWLEDGE.lowCoverage ? ChatConfidence.LOW : ChatConfidence.NONE;

    return {
      available: true,
      confidence,
      matches: confidence === ChatConfidence.NONE ? [] : hits.map((hit) => ({ doc: docs[hit.index], score: hit.score })),
    };
  }

  /** Forgets the cached index so the next question reads the latest content. */
  invalidate(): void {
    this.built = null;
  }

  private async getIndex(): Promise<BuiltIndex> {
    if (this.built && Date.now() - this.built.builtAt < KNOWLEDGE.cacheTtlMs) return this.built;
    // Questions that arrive while the index is being built share the same build instead of each starting one.
    this.loading ??= this.build().finally(() => {
      this.loading = null;
    });
    this.built = await this.loading;
    return this.built;
  }

  private async build(): Promise<BuiltIndex> {
    const [faqs, pages] = await Promise.all([
      this.prisma.fAQ.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: KNOWLEDGE.maxFaqs,
        select: { id: true, question: true, answer: true },
      }),
      this.prisma.cMSPage.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: KNOWLEDGE.maxPages,
        select: { id: true, title: true, content: true },
      }),
    ]);

    const docs: KnowledgeDoc[] = [];
    for (const faq of faqs) {
      docs.push({ kind: KnowledgeSourceKind.FAQ, id: faq.id, title: stripHtml(faq.question), body: stripHtml(faq.answer) });
    }
    for (const page of pages) {
      for (const chunk of chunkText(stripHtml(page.content), KNOWLEDGE.chunkChars)) {
        docs.push({ kind: KnowledgeSourceKind.PAGE, id: page.id, title: page.title, body: chunk });
      }
    }

    // A FAQ question is what people search for, so it counts double next to its answer.
    const tokens = docs.map((doc) =>
      tokenize(doc.kind === KnowledgeSourceKind.FAQ ? `${doc.title} ${doc.title} ${doc.body}` : `${doc.title} ${doc.body}`),
    );
    return { builtAt: Date.now(), docs, index: new Bm25Index(tokens) };
  }
}
