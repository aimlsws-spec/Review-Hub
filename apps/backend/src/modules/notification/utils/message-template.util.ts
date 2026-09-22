import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { MESSAGE_VARIABLES } from '../constants/broadcast.constants';

const VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

/** Names of every {{placeholder}} used in the text, in order of first appearance. */
export function extractVariables(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) found.add(match[1]);
  return [...found];
}

/** Placeholders in the text that we do not fill in, which would otherwise be sent to users as literal "{{text}}". */
export function findUnsupportedVariables(text: string): string[] {
  const supported: readonly string[] = MESSAGE_VARIABLES;
  return extractVariables(text).filter((name) => !supported.includes(name));
}

/** Refuses text that uses a placeholder we cannot fill in, telling the admin which ones are allowed. */
export function assertSupportedPlaceholders(...texts: Array<string | undefined>): void {
  const unsupported = [...new Set(texts.filter((text): text is string => !!text).flatMap(findUnsupportedVariables))];
  if (unsupported.length === 0) return;

  const allowed = MESSAGE_VARIABLES.map((name) => `{{${name}}}`).join(', ');
  throw new BadRequestException(
    `Unsupported placeholder ${unsupported.map((name) => `{{${name}}}`).join(', ')}. Only ${allowed} can be used.`,
  );
}

/** Fills in the supported placeholders. Callers must reject unsupported ones first; any left over are kept as written. */
export function renderMessage(text: string, values: { firstName: string }): string {
  return text.replace(VARIABLE_PATTERN, (whole, name: string) => (name === 'firstName' ? values.firstName : whole));
}
