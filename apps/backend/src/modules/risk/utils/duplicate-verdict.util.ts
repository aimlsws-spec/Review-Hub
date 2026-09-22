import { FraudRiskLevel } from '@prisma/client';

import { TEXT_DIFFERENT_SIMILARITY, TEXT_SAME_SIMILARITY } from '../constants';

const MIN_WORD_LENGTH = 3;

/** How alike two blocks of text are, 0 to 1, by the share of their (longer) words they have in common. */
export function wordSimilarity(a: string, b: string): number {
  const words = (text: string) => new Set(text.split(/\s+/).filter((word) => word.length >= MIN_WORD_LENGTH));
  const wordsA = words(a);
  const wordsB = words(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared++;
  return shared / (wordsA.size + wordsB.size - shared);
}

export interface DuplicateVerdict {
  riskLevel: FraudRiskLevel;
  reason: string;
}

/**
 * Decides how seriously to take two near-identical pictures.
 *
 * The picture alone cannot settle it: two honest users' screenshots of the same app screen look almost the
 * same and differ only in a username, so flagging every such pair would bury reviewers in false alarms.
 * The words OCR read from each picture settle it when we have them. Their meaning here:
 *   null  OCR did not run, so we cannot tell.
 *   ""    OCR ran and found no meaningful text, which means a photo. A photo matching another photo is a strong sign.
 *   text  a screenshot, whose words can be compared.
 *
 * Returns null when the pictures only look alike and the evidence says they are different (not a duplicate).
 */
export function judgeDuplicate(params: {
  sameUser: boolean;
  mineText: string | null;
  theirText: string | null;
}): DuplicateVerdict | null {
  const { sameUser, mineText, theirText } = params;

  // Reusing your own picture (for a retry, or for two tasks) is worth a note but never worth holding a reward.
  if (sameUser) return { riskLevel: 'LOW', reason: 'Uploaded evidence looks the same as a picture this user submitted before' };

  const different = 'Uploaded evidence looks the same as a picture already submitted by a different user';

  if (mineText === null || theirText === null) {
    return { riskLevel: 'MEDIUM', reason: `${different}, but the text in it could not be compared` };
  }
  if (mineText === '' && theirText === '') return { riskLevel: 'HIGH', reason: different };
  if (mineText === '' || theirText === '') return { riskLevel: 'MEDIUM', reason: `${different}, but one has text and the other does not` };

  const similarity = wordSimilarity(mineText, theirText);
  if (similarity >= TEXT_SAME_SIMILARITY) return { riskLevel: 'HIGH', reason: `${different}, with matching text` };
  if (similarity < TEXT_DIFFERENT_SIMILARITY) return null;
  return { riskLevel: 'MEDIUM', reason: `${different}, with partly matching text` };
}

const RISK_ORDER: Record<FraudRiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/** True when `a` is more serious than `b`. */
export function isRiskier(a: FraudRiskLevel, b: FraudRiskLevel): boolean {
  return RISK_ORDER[a] > RISK_ORDER[b];
}
