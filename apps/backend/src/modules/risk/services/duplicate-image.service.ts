import { Injectable, Logger } from '@nestjs/common';
import { FraudRiskLevel } from '@prisma/client';

import { DUPLICATE_LOOKBACK_DAYS, DUPLICATE_MAX_MATCHES, PERCEPTUAL_MAX_DISTANCE } from '../constants';
import { DuplicateImageRepository, SimilarAttachment, SubmissionSignalRepository } from '../repositories';
import { DuplicateVerdict, isRiskier, judgeDuplicate } from '../utils/duplicate-verdict.util';
import { hexToSignedBigInt, isValidHashHex } from '../utils/perceptual-hash.util';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Catches the same picture being submitted more than once, even when it was re-saved, recompressed or
 * resized (which defeats an exact checksum). It records the picture's fingerprint, compares it with recent
 * ones, and raises a flag whose seriousness depends on whether the match is another user's and whether the
 * text in the pictures agrees.
 */
@Injectable()
export class DuplicateImageService {
  private readonly logger = new Logger(DuplicateImageService.name);

  constructor(
    private readonly duplicateRepository: DuplicateImageRepository,
    private readonly signalRepository: SubmissionSignalRepository,
  ) {}

  /** Returns the flag's risk level, or null when the picture is new (or only looks like one that is provably different). */
  async check(params: {
    submissionId: string;
    userId: string;
    perceptualHash: string;
    evidenceText?: string | null;
  }): Promise<FraudRiskLevel | null> {
    if (!isValidHashHex(params.perceptualHash)) {
      this.logger.warn(`Ignoring malformed image fingerprint for submission ${params.submissionId}`);
      return null;
    }

    const hash = hexToSignedBigInt(params.perceptualHash);
    const evidenceText = params.evidenceText ?? null;

    // Store first: even if the comparison below fails, later submissions can still be checked against this one.
    await this.duplicateRepository.saveFingerprint(params.submissionId, hash, evidenceText);

    const matches = await this.duplicateRepository.findSimilar({
      submissionId: params.submissionId,
      perceptualHash: hash,
      maxDistance: PERCEPTUAL_MAX_DISTANCE,
      since: new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * DAY_MS),
      limit: DUPLICATE_MAX_MATCHES,
    });

    const worst = this.worstVerdict(matches, params.userId, evidenceText);
    if (!worst) return null;

    // The exact-checksum check may already have flagged this very match; one flag per match is enough.
    if (await this.signalRepository.hasFlagAbout(params.submissionId, 'DUPLICATE_SUBMISSION', worst.match.submissionId)) return null;

    await this.signalRepository.createFlag({
      submissionId: params.submissionId,
      userId: params.userId,
      type: 'DUPLICATE_SUBMISSION',
      riskLevel: worst.verdict.riskLevel,
      reason: worst.verdict.reason,
      metadata: {
        kind: 'perceptual',
        matchedSubmissionId: worst.match.submissionId,
        matchedUserId: worst.match.userId,
        differingBits: worst.match.distance,
        otherMatches: matches.filter((m) => m !== worst.match).map((m) => m.submissionId),
      },
    });

    this.logger.warn(
      `Near-duplicate image on submission ${params.submissionId}: ${worst.verdict.riskLevel} (${worst.match.distance} bits from ${worst.match.submissionId})`,
    );
    return worst.verdict.riskLevel;
  }

  /** Of all the matches, the one worth reporting: the most serious verdict, and the closest picture among equals. */
  private worstVerdict(
    matches: SimilarAttachment[],
    userId: string,
    mineText: string | null,
  ): { match: SimilarAttachment; verdict: DuplicateVerdict } | null {
    let worst: { match: SimilarAttachment; verdict: DuplicateVerdict } | null = null;

    for (const match of matches) {
      const verdict = judgeDuplicate({ sameUser: match.userId === userId, mineText, theirText: match.evidenceText });
      if (!verdict) continue;

      if (!worst || isRiskier(verdict.riskLevel, worst.verdict.riskLevel) || (verdict.riskLevel === worst.verdict.riskLevel && match.distance < worst.match.distance)) {
        worst = { match, verdict };
      }
    }
    return worst;
  }
}
