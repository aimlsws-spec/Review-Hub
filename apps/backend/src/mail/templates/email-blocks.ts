import { escapeHtml } from '@common/utils';

/**
 * Building blocks for the body of a Viralkar email. Every value passed in is escaped here, so callers hand over plain
 * text and never build HTML from user input themselves. Styles are inline because most mail apps drop <style> tags.
 */
export const EMAIL_COLORS = {
  brand: '#F18E31',
  brandDark: '#E4771A',
  brandSoft: '#FFF7ED',
  text: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  page: '#F1F5F9',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${EMAIL_COLORS.text};">${escapeHtml(text)}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${EMAIL_COLORS.body};">${escapeHtml(text)}</p>`;
}

/** A one-time code, large and spaced so it is easy to read and copy. */
export function emailCode(code: string, caption: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">` +
    `<tr><td align="center" style="background:${EMAIL_COLORS.brandSoft};border:1px dashed ${EMAIL_COLORS.brand};border-radius:12px;padding:20px 12px;">` +
    `<div style="font-family:'Courier New',Courier,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:${EMAIL_COLORS.text};">${escapeHtml(code)}</div>` +
    `<div style="margin-top:8px;font-family:${FONT};font-size:13px;line-height:18px;color:${EMAIL_COLORS.muted};">${escapeHtml(caption)}</div>` +
    `</td></tr></table>`
  );
}

/** A call to action. Only for links the platform builds itself, never a URL taken from a request. */
export function emailButton(label: string, url: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr>` +
    `<td style="border-radius:10px;background:${EMAIL_COLORS.brand};background-image:linear-gradient(135deg,${EMAIL_COLORS.brand},${EMAIL_COLORS.brandDark});">` +
    `<a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

/** Label/value rows, e.g. the device and time of a sign-in. */
export function emailDetails(rows: Array<[label: string, value: string]>): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;font-family:${FONT};font-size:14px;color:${EMAIL_COLORS.muted};width:40%;vertical-align:top;">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;font-family:${FONT};font-size:14px;color:${EMAIL_COLORS.text};font-weight:600;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid ${EMAIL_COLORS.border};border-bottom:1px solid ${EMAIL_COLORS.border};">${body}</table>`;
}

/** Numbered next steps. */
export function emailSteps(steps: string[]): string {
  const rows = steps
    .map(
      (step, index) =>
        `<tr><td style="width:32px;padding:6px 0;vertical-align:top;">` +
        `<div style="width:24px;height:24px;border-radius:12px;background:${EMAIL_COLORS.brandSoft};color:${EMAIL_COLORS.brandDark};font-family:${FONT};font-size:13px;font-weight:700;line-height:24px;text-align:center;">${index + 1}</div></td>` +
        `<td style="padding:6px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${EMAIL_COLORS.body};">${escapeHtml(step)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows}</table>`;
}

/** A highlighted note. `warning` is for security messages ("if this wasn't you..."). */
export function emailNote(text: string, tone: 'info' | 'warning' = 'info'): string {
  const [background, border, color] =
    tone === 'warning'
      ? [EMAIL_COLORS.dangerSoft, EMAIL_COLORS.danger, EMAIL_COLORS.danger]
      : [EMAIL_COLORS.brandSoft, EMAIL_COLORS.brand, EMAIL_COLORS.body];
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>` +
    `<td style="background:${background};border-left:4px solid ${border};border-radius:8px;padding:12px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${color};">${escapeHtml(text)}</td>` +
    `</tr></table>`
  );
}

/** Small print under the main content. */
export function emailSmallPrint(text: string): string {
  return `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">${escapeHtml(text)}</p>`;
}

export { FONT as EMAIL_FONT };
