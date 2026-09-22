/**
 * The honest-feedback wording policy.
 *
 * The platform rewards people for taking part and giving honest feedback. It must never reward, or ask for, a good
 * rating: Google, Meta and the app stores all ban paid or conditional reviews, and a campaign that asks for one can
 * get a merchant's profile suspended. This file finds wording in a campaign that asks for a particular rating,
 * requires or rewards a positive review, supplies the review text, or asks for reviews from people who never used
 * the business.
 *
 * WHY patterns with context and not a word list: "5 star hotel", "we never accept fake reviews" and "negative
 * reviews are welcome" are all normal, honest wording. Only phrasing that asks the reader to DO something about a
 * rating counts. Every rule has tests for what it must catch and for what it must leave alone.
 */

export enum WordingSeverity {
  /** The campaign can not be submitted or approved until this is reworded. */
  BLOCK = 'BLOCK',
  /** An admin sees it while reviewing, and the merchant is told, but it does not stop submission. */
  REVIEW = 'REVIEW',
}

export enum WordingRule {
  REQUIRES_RATING = 'REQUIRES_RATING',
  REQUIRES_POSITIVE = 'REQUIRES_POSITIVE',
  SCRIPTED_REVIEW = 'SCRIPTED_REVIEW',
  NO_VISIT_NEEDED = 'NO_VISIT_NEEDED',
  FAKE_OR_MULTIPLE = 'FAKE_OR_MULTIPLE',
  POSITIVE_WORDING = 'POSITIVE_WORDING',
  STAR_MENTION = 'STAR_MENTION',
}

export interface WordingFinding {
  rule: WordingRule;
  severity: WordingSeverity;
  /** Which piece of text it was found in, e.g. "description" or "task: Write a review". */
  field: string;
  /** The words found, with a little around them so the merchant can find them. */
  excerpt: string;
  /** What is wrong and what to do instead, in plain words. */
  message: string;
}

export interface WordingInput {
  field: string;
  text?: string | null;
}

interface RuleDefinition {
  rule: WordingRule;
  severity: WordingSeverity;
  message: string;
  patterns: RegExp[];
  /** Ignore a match that is being denied, as in "we never accept fake reviews". */
  skipIfNegated?: boolean;
  /** Ignore a match that is clearly about honest or mixed feedback. */
  skipIfHonestContext?: boolean;
}

const STARS = String.raw`(?:stars?|\*+)`;
const COUNT_HIGH = String.raw`(?:5|five|4|four)`;
const POSITIVE = String.raw`(?:positive|good|great|glowing|favou?rable|excellent|amazing|awesome)`;
const REVIEWISH = String.raw`(?:reviews?|ratings?|feedback|comments?|testimonials?)`;
const PLATFORM = String.raw`(?:google\s+|play\s*store\s+|app\s*store\s+|maps\s+)?`;
const NEGATIVE = String.raw`(?:negative|bad|low|poor|critical|unfavou?rable)`;

const ok = (source: string, flags = 'i') => new RegExp(source, flags);

export const RATING_GUIDANCE =
  'A reward must never depend on the rating. Ask people for their honest feedback, good or bad.';

export const WORDING_RULES: RuleDefinition[] = [
  {
    rule: WordingRule.REQUIRES_RATING,
    severity: WordingSeverity.BLOCK,
    message: `This asks for a particular star rating. ${RATING_GUIDANCE}`,
    patterns: [
      // "give us 5 stars", "leave a 5 star review", "rate us 5 stars". Not "give guests 5 star service".
      ok(
        String.raw`\b(?:give|leave|rate|award|put|post|drop|write|submit|mark)\b(?:\s+\w+){0,3}?\s+${COUNT_HIGH}[\s-]*${STARS}(?!\s+(?:service|experience|treatment|hospitality|stay|rooms?|food|quality|meals?|dining|amenities|hotel|resort|restaurant|cafe|facilities))`,
      ),
      // "a 5 star review", "5-star rating"
      ok(String.raw`\b(?:5|five)[\s-]*stars?\s+${PLATFORM}${REVIEWISH}\b`),
      // "★★★★★"
      ok(String.raw`(?:[★⭐]\s*){3,}`, 'u'),
      ok(String.raw`\b(?:highest|top|maximum|max|perfect|full)\s+(?:possible\s+)?(?:rating|ratings|stars?|score)\b`),
      // "4 stars or above", "4+ stars"
      ok(String.raw`\b(?:4|four)[\s-]*stars?\s*(?:\+|plus|or\s+(?:above|higher|more|better|up))`),
      ok(String.raw`\b(?:at\s+least|minimum|min\.?)\s*(?:a\s+)?${COUNT_HIGH}[\s-]*stars?\b`),
      ok(String.raw`\b(?:rating|stars?)\s+(?:of\s+)?(?:at\s+least|minimum|above|over)\s*${COUNT_HIGH}\b`),
      // Hinglish
      ok(String.raw`\b(?:5|five|panch)\s*star\s+(?:do|dena|de|dijiye|dijie)\b`),
    ],
  },
  {
    rule: WordingRule.REQUIRES_POSITIVE,
    severity: WordingSeverity.BLOCK,
    message: `This requires or rewards a positive review. ${RATING_GUIDANCE}`,
    skipIfNegated: true,
    patterns: [
      ok(String.raw`\b(?:only|just|strictly)\s+(?:${POSITIVE}|5[\s-]*star)\b`),
      ok(String.raw`\b(?:must|should|needs?\s+to|has\s+to|have\s+to)\s+be\s+(?:a\s+)?(?:${POSITIVE}|5[\s-]*star)\b`),
      // "write a positive review", "leave us a great rating"
      ok(
        String.raw`\b(?:write|post|leave|give|submit|drop|share|add)\s+(?:(?:us|a|an|the|your)\s+)*${POSITIVE}\s+${PLATFORM}${REVIEWISH}\b`,
      ),
      // "earn Rs 50 for a positive review"
      ok(String.raw`\b(?:reward|pay|paid|earn|get|receive|win)\b[^.\n]{0,40}\b(?:for\s+)?(?:a\s+|an\s+)?(?:${POSITIVE}|5[\s-]*star)\s+${REVIEWISH}\b`),
      // "no negative reviews"
      ok(String.raw`\b(?:no|without|avoid|(?:don'?t|do\s+not)\s+(?:post|write|leave|give))\s+(?:any\s+)?${NEGATIVE}\s+${REVIEWISH}\b`),
      // "we do not accept negative reviews"
      ok(
        String.raw`\b(?:do\s+not|don'?t|will\s+not|won'?t|cannot|can'?t)\s+(?:accept|allow|permit|take|want|reward|pay\s+for|count|approve)\s+(?:any\s+)?${NEGATIVE}\s+${REVIEWISH}\b`,
      ),
      // "negative reviews will not be accepted" (and not "are accepted")
      ok(
        String.raw`\b${NEGATIVE}\s+${REVIEWISH}\s+(?:\w+\s+){0,2}?(?:will\s+not|won'?t|are\s+not|is\s+not|aren'?t|isn'?t|cannot|can'?t|never|not)\s+(?:be\s+)?(?:accepted|paid|rewarded|approved|counted|eligible|allowed|valid)\b`,
      ),
      // Hinglish
      ok(String.raw`\b(?:acha|accha|achha|badhiya|badiya|mast)\s+(?:review|rating|feedback)\b`),
    ],
  },
  {
    rule: WordingRule.SCRIPTED_REVIEW,
    severity: WordingSeverity.BLOCK,
    message:
      'This supplies the review text or asks people to copy it. A review must be written by the person, in their own words, about their own experience.',
    patterns: [
      ok(String.raw`\b(?:copy|paste)\b[^.\n]{0,40}\b(?:review|comment|testimonial|script)\b`),
      ok(String.raw`\b(?:review|comment|testimonial)\s+(?:text\s+)?(?:will\s+be\s+|is\s+|are\s+)?(?:provided|supplied|given|shared|sent)\s+(?:by\s+us|to\s+you|below|here)\b`),
      ok(String.raw`\bwe\s+(?:will\s+|'ll\s+)?(?:provide|give|send|supply|share)\s+(?:you\s+)?(?:with\s+)?(?:the\s+|a\s+)?(?:review|script)\b`),
    ],
  },
  {
    rule: WordingRule.NO_VISIT_NEEDED,
    severity: WordingSeverity.BLOCK,
    message: 'This asks for a review from someone who did not use the business. Only people with a real experience can review it honestly.',
    patterns: [
      ok(
        String.raw`\b${REVIEWISH}\b[^.\n]{0,60}\b(?:without|no\s+need\s+to|don'?t\s+need\s+to|not\s+required\s+to|even\s+if\s+you\s+(?:haven'?t|have\s+not|didn'?t|did\s+not))\s+(?:actually\s+)?(?:visit(?:ed|ing)?|buy(?:ing)?|bought|purchas(?:e|ed|ing)|us(?:e|ed|ing)|tr(?:y|ied|ying)|order(?:ed|ing)?|been)\b`,
      ),
      ok(
        String.raw`\b(?:without|no\s+need\s+to|don'?t\s+need\s+to|not\s+required\s+to)\s+(?:actually\s+)?(?:visit|visiting|buy|buying|purchase|purchasing|use|using|try|trying|order|ordering)\b[^.\n]{0,60}\b${REVIEWISH}\b`,
      ),
    ],
  },
  {
    rule: WordingRule.FAKE_OR_MULTIPLE,
    severity: WordingSeverity.BLOCK,
    message: 'This mentions fake reviews or reviews from several accounts. Each person may give one honest review from their own account.',
    skipIfNegated: true,
    patterns: [
      ok(String.raw`\b(?:fake|paid|bought|purchased|bulk)\s+${REVIEWISH}\b`),
      ok(
        String.raw`\b${REVIEWISH}\b[^.\n]{0,60}\b(?:multiple|several|many|different|other|extra|second)\s+(?:google\s+)?(?:accounts?|profiles?|emails?|devices?|numbers?)\b`,
      ),
      ok(
        String.raw`\b(?:multiple|several|many|different|other|extra|second)\s+(?:google\s+)?(?:accounts?|profiles?|emails?|devices?|numbers?)\b[^.\n]{0,60}\b${REVIEWISH}\b`,
      ),
    ],
  },
  {
    rule: WordingRule.POSITIVE_WORDING,
    severity: WordingSeverity.REVIEW,
    message: 'This talks about good or positive reviews. Say "honest review" instead, so nobody reads it as a request for praise.',
    skipIfHonestContext: true,
    patterns: [ok(String.raw`\b${POSITIVE}\s+${PLATFORM}${REVIEWISH}\b`), ok(String.raw`\bbest\s+${PLATFORM}${REVIEWISH}\b`)],
  },
  {
    rule: WordingRule.STAR_MENTION,
    severity: WordingSeverity.REVIEW,
    message: 'This mentions star ratings. Make sure it does not ask for, or reward, a particular rating.',
    skipIfHonestContext: true,
    patterns: [
      ok(String.raw`\b(?:review|rating|feedback|rate)\b[^.\n]{0,40}\b(?:[1-5]|one|two|three|four|five)[\s-]*stars?\b`),
      ok(String.raw`\b(?:[1-5]|one|two|three|four|five)[\s-]*stars?\b[^.\n]{0,40}\b(?:review|rating|feedback)\b`),
    ],
  },
];

const NEGATION_BEFORE = /\b(?:no|not|never|don'?t|do\s+not|doesn'?t|does\s+not|won'?t|will\s+not|without|against|zero|reject(?:ed|s)?|ban(?:ned|s)?|prohibit(?:ed|s)?|forbid(?:den)?|stop|avoid|refuse[sd]?)\b[^.\n]{0,30}$/i;
const HONEST_BEFORE = /\b(?:honest|genuine|real|truthful|own|sincere|unbiased)\b[^.\n]{0,40}$/i;
const NEGATION_AFTER = /^[^.\n]{0,30}\b(?:not|never|isn'?t|aren'?t|won'?t|cannot|can'?t)\s+(?:be\s+)?(?:accepted|allowed|permitted|eligible|counted|valid|welcome|tolerated|rewarded)\b/i;
const MIXED_AFTER = /^[^.\n]{0,30}\b(?:or|and|whether|regardless)\s+(?:of\s+)?(?:negative|bad|poor|critical|the\s+rating|rating)\b/i;

const EXCERPT_CONTEXT = 30;
const MAX_FINDINGS = 12;

/**
 * Lower-cases and tidies text so simple tricks do not slip past: full-width letters, invisible characters,
 * doubled spaces. The original text is kept for the excerpt shown to the merchant.
 */
export function normalizeForWording(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ');
}

function excerptAround(text: string, start: number, end: number): string {
  const from = Math.max(0, start - EXCERPT_CONTEXT);
  const to = Math.min(text.length, end + EXCERPT_CONTEXT);
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

function overlaps(spans: Array<[number, number]>, start: number, end: number): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

/** Finds every piece of wording that breaks the policy, most serious first. */
export function evaluateWording(inputs: WordingInput[]): WordingFinding[] {
  const findings: WordingFinding[] = [];
  const seen = new Set<string>();

  for (const { field, text } of inputs) {
    if (!text || !text.trim()) continue;
    const normalized = normalizeForWording(text);
    // Spans already explained by a more serious rule, so the same words are not reported twice.
    const covered: Array<[number, number]> = [];

    for (const definition of WORDING_RULES) {
      for (const pattern of definition.patterns) {
        const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
        for (const match of normalized.matchAll(global)) {
          const start = match.index ?? 0;
          const end = start + match[0].length;

          // The same words are only ever reported once, by the most serious rule that found them.
          if (overlaps(covered, start, end)) continue;
          if (
            definition.skipIfNegated &&
            (NEGATION_BEFORE.test(normalized.slice(Math.max(0, start - 40), start)) || NEGATION_AFTER.test(normalized.slice(end, end + 50)))
          ) {
            continue;
          }
          if (
            definition.skipIfHonestContext &&
            (HONEST_BEFORE.test(normalized.slice(Math.max(0, start - 50), start)) || MIXED_AFTER.test(normalized.slice(end, end + 50)))
          ) {
            continue;
          }

          const key = `${definition.rule}|${field}|${match[0].toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);

          covered.push([start, end]);
          findings.push({
            rule: definition.rule,
            severity: definition.severity,
            field,
            excerpt: excerptAround(normalized, start, end),
            message: definition.message,
          });
          if (findings.length >= MAX_FINDINGS) return sortBySeverity(findings);
        }
      }
    }
  }

  return sortBySeverity(findings);
}

function sortBySeverity(findings: WordingFinding[]): WordingFinding[] {
  const rank = { [WordingSeverity.BLOCK]: 0, [WordingSeverity.REVIEW]: 1 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export const blockingFindings = (findings: WordingFinding[]): WordingFinding[] =>
  findings.filter((finding) => finding.severity === WordingSeverity.BLOCK);
