import { buildWelcomeEmail } from '../../modules/auth/emails/account-emails';
import { buildOtpEmail } from '../../modules/auth/emails/otp-email';
import { buildMerchantRejectedEmail } from '../../modules/merchant/emails/merchant-emails';

import { emailParagraph } from './email-blocks';
import { htmlToPlainText, renderEmailLayout } from './email-layout';

describe('Viralkar email templates', () => {
  it('frames a body in the branded layout with a hidden preview line', () => {
    const html = renderEmailLayout(emailParagraph('Hello there'), 'Preview text');

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('Viralkar');
    expect(html).toContain('Hello there');
    expect(html).toContain('Preview text');
    expect(html).toContain('You are receiving this email because you have a Viralkar account.');
  });

  it('escapes every value, so a name can never inject markup', () => {
    const { html } = buildMerchantRejectedEmail('<a href="https://evil.test">Cafe</a>', '<script>x</script>');

    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;Cafe&lt;/a&gt;');
  });

  it('puts the code in the subject and body, says what it is for and when it expires', () => {
    const email = buildOtpEmail({ type: 'EMAIL_VERIFICATION', code: '482913', expiryMinutes: 5, firstName: 'Asha' });

    expect(email.subject).toBe('482913 is your Viralkar code');
    expect(email.html).toContain('Verify your email address');
    expect(email.html).toContain('Hi Asha,');
    expect(email.html).toContain('482913');
    expect(email.html).toContain('expires in 5 minutes');
  });

  it('warns about codes that open the account', () => {
    expect(buildOtpEmail({ type: 'PASSWORD_RESET', code: '111111', expiryMinutes: 5 }).html).toContain('consider changing your password');
    expect(buildOtpEmail({ type: 'EMAIL_VERIFICATION', code: '111111', expiryMinutes: 5 }).html).not.toContain('consider changing your password');
  });

  it('welcomes with the first steps: identity verification, tasks, bank account', () => {
    const text = htmlToPlainText(buildWelcomeEmail('Asha').html);

    expect(text).toContain('Hi Asha,');
    expect(text).toContain('identity verification');
    expect(text).toContain('Browse campaigns');
    expect(text).toContain('bank account');
  });
});
