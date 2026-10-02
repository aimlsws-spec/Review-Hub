import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserDocumentType } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { describeError } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { UserKycDocumentRepository } from '../repositories';

/** What the admin reviewer sees. MATCH/PARTIAL/MISMATCH come from the AI service; the others explain why there is no answer. */
export type KycOcrStatus = 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'UNREADABLE' | 'UNAVAILABLE' | 'NOT_AN_IMAGE';

export interface KycOcrCheck {
  status: KycOcrStatus;
  numberMatches: boolean | null;
  nameMatches: boolean | null;
  confidence: number;
}

export interface KycOcrInput {
  documentId: string;
  userId: string;
  documentType: UserDocumentType;
  documentNumber?: string | null;
  buffer: Buffer;
  mimeType: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Spec FR-012/FR-013: OCR validation of KYC uploads, with manual review when confidence is low.
 *
 * Every document still goes to a human; this never approves anything. OCR reads an edited image as happily as a
 * real card, so the check is a hint that puts obvious mismatches (wrong PAN typed, someone else's card) in front
 * of the reviewer, the same "signal, not verdict" rule the fraud checks follow. It runs after the upload has been
 * saved, so a slow or absent AI service never delays or blocks a user's upload.
 */
@Injectable()
export class KycOcrService {
  private readonly logger = new Logger(KycOcrService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly documentRepository: UserKycDocumentRepository,
  ) {}

  /** Starts the check without waiting for it. Failures are logged and recorded as UNAVAILABLE, never thrown. */
  checkInBackground(input: KycOcrInput): void {
    void this.check(input).catch((error) => this.logger.error(`KYC OCR check for ${input.documentId} failed: ${describeError(error)}`));
  }

  async check(input: KycOcrInput): Promise<KycOcrCheck> {
    const result = IMAGE_TYPES.includes(input.mimeType) ? await this.askAiService(input) : blank('NOT_AN_IMAGE');
    await this.documentRepository.update(input.documentId, {
      ocrCheck: result as unknown as Prisma.InputJsonValue,
      ocrCheckedAt: new Date(),
    });
    return result;
  }

  private async askAiService(input: KycOcrInput): Promise<KycOcrCheck> {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { firstName: true, lastName: true } });
    const form = new FormData();
    form.append('documentType', input.documentType);
    if (input.documentNumber) form.append('documentNumber', input.documentNumber);
    if (user) form.append('fullName', `${user.firstName} ${user.lastName}`.trim());
    form.append('file', new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }), 'document');

    try {
      const response = await firstValueFrom(
        this.http.post<Partial<KycOcrCheck>>(`${this.config.get<string>('ai.serviceUrl')}/v1/kyc/read`, form, {
          headers: {
            'X-Api-Key': this.config.get<string>('ai.apiKey'),
            'X-Api-Secret': this.config.get<string>('ai.apiSecret'),
          },
          timeout: this.config.get<number>('ai.timeoutMs'),
        }),
      );
      return this.normalise(response.data);
    } catch (error) {
      this.logger.warn(`AI service could not read KYC document ${input.documentId}: ${describeError(error)}`);
      return blank('UNAVAILABLE');
    }
  }

  /** Keeps only the fields and values we expect, so nothing unexpected from the AI service is stored or shown. */
  private normalise(data: Partial<KycOcrCheck>): KycOcrCheck {
    const statuses: KycOcrStatus[] = ['MATCH', 'PARTIAL', 'MISMATCH', 'UNREADABLE', 'UNAVAILABLE'];
    const flag = (value: unknown) => (typeof value === 'boolean' ? value : null);
    return {
      status: statuses.includes(data.status as KycOcrStatus) ? (data.status as KycOcrStatus) : 'UNAVAILABLE',
      numberMatches: flag(data.numberMatches),
      nameMatches: flag(data.nameMatches),
      confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0,
    };
  }
}

function blank(status: KycOcrStatus): KycOcrCheck {
  return { status, numberMatches: null, nameMatches: null, confidence: 0 };
}
