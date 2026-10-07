import { escapeHtml } from '@common/utils';

import { EMAIL_COLORS, EMAIL_FONT } from './email-blocks';

/**
 * Wraps an email's body in the Viralkar frame: brand header, white card, and a footer saying why the person got it.
 * MailService applies it to every email that is not already a full HTML document, so each sender only writes the
 * body (see email-blocks.ts) and every message looks like it comes from the same product.
 */
export function renderEmailLayout(body: string, preheader?: string): string {
  const year = new Date().getFullYear();
  // The preheader is the grey preview line inbox lists show after the subject; hidden in the email itself.
  const hiddenPreheader = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Viralkar</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.page};">
${hiddenPreheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:${EMAIL_COLORS.brand};background-image:linear-gradient(135deg,${EMAIL_COLORS.brand},${EMAIL_COLORS.brandDark});border-radius:16px 16px 0 0;padding:24px 32px;">
            <span style="font-family:${EMAIL_FONT};font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;">Viralkar</span>
            <div style="font-family:${EMAIL_FONT};font-size:13px;color:#FFF7ED;margin-top:2px;">Share honestly. Get rewarded.</div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:32px;border-radius:0 0 16px 16px;border:1px solid ${EMAIL_COLORS.border};border-top:none;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 16px;text-align:center;font-family:${EMAIL_FONT};font-size:12px;line-height:18px;color:${EMAIL_COLORS.muted};">
            You are receiving this email because you have a Viralkar account.<br>
            Need help? Open <strong>Help &amp; Support</strong> in the Viralkar app.<br>
            &copy; ${year} Viralkar. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Plain-text version for mail apps that do not show HTML: the body's text with the tags removed. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|\/p|\/h1|\/h2|\/tr|\/div|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, '©')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}
