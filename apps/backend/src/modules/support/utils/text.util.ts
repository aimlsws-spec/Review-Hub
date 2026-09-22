import { STOPWORDS, SYNONYMS } from '../constants/chatbot.constants';

/**
 * Turns admin-written HTML into plain text. Order matters: tags are removed before entities are decoded,
 * so an escaped "&lt;b&gt;" in the source can never turn back into a tag.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\s*br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Cuts plain suffixes so "withdrawals" and "withdrawing" meet. Only touches plain English words. */
function stem(word: string): string {
  if (!/^[a-z]+$/.test(word)) return word;
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Lower-cases, splits on anything that is not a letter, a digit or a combining mark, and drops words with no
 * meaning. Combining marks are kept because scripts like Devanagari write vowels as marks, so splitting on them
 * would cut every word into pieces.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
    .map((word) => stem(SYNONYMS[word] ?? word))
    .filter((word) => !STOPWORDS.has(word));
}

/** Splits long text into pieces of about `maxChars`, breaking between lines so a sentence is never cut in half. */
export function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (current && current.length + line.length + 1 > maxChars) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Shortens to about `maxChars`, at the end of a sentence when there is one in reach. */
export function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('\n'));
  return lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1).trim() : `${cut.trim()}…`;
}
