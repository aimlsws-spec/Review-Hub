import { OtpType } from '@prisma/client';

import { emailCode, emailHeading, emailNote, emailParagraph, emailSmallPrint } from '../../../mail/templates';

/** What each kind of code is for, in the person's words. */
const PURPOSE: Record<OtpType, { subject: string; heading: string; intro: string }> = {
  REGISTRATION: {
    subject: 'Confirm your Viralkar account',
    heading: 'Confirm your account',
    intro: 'Enter this code in the Viralkar app to finish creating your account.',
  },
  EMAIL_VERIFICATION: {
    subject: 'Verify your email for Viralkar',
    heading: 'Verify your email address',
    intro: 'Enter this code in the Viralkar app to confirm this is your email address. You need it to start earning.',
  },
  PASSWORD_RESET: {
    subject: 'Reset your Viralkar password',
    heading: 'Reset your password',
    intro: 'Someone asked to reset the password for your Viralkar account. Enter this code to choose a new one.',
  },
  NEW_DEVICE_LOGIN: {
    subject: 'Confirm your sign-in to Viralkar',
    heading: 'Confirm it is you',
    intro: 'Your account is being signed in to from a new device. Enter this code to allow it.',
  },
  TWO_FACTOR: {
    subject: 'Your Viralkar sign-in code',
    heading: 'Your sign-in code',
    intro: 'Enter this code to finish signing in to Viralkar.',
  },
  PHONE_VERIFICATION: {
    subject: 'Verify your phone number for Viralkar',
    heading: 'Verify your phone number',
    intro: 'Enter this code in the Viralkar app to confirm your phone number.',
  },
  PHONE_CHANGE: {
    subject: 'Confirm your new phone number',
    heading: 'Confirm your new phone number',
    intro: 'Enter this code in the Viralkar app to confirm the change of phone number on your account.',
  },
};

/** Codes that let someone into the account, where a stranger asking for one is worth a warning. */
const ACCESS_CODES: ReadonlySet<OtpType> = new Set<OtpType>(['PASSWORD_RESET', 'NEW_DEVICE_LOGIN', 'TWO_FACTOR']);

/**
 * The email that carries a one-time code. The code is in the subject too, so it can be read from the notification
 * without opening the email.
 */
export function buildOtpEmail(params: { type: OtpType; code: string; expiryMinutes: number; firstName?: string | null }): {
  subject: string;
  html: string;
  preheader: string;
} {
  const purpose = PURPOSE[params.type];
  const greeting = params.firstName ? `Hi ${params.firstName},` : 'Hi,';
  const html = [
    emailHeading(purpose.heading),
    emailParagraph(greeting),
    emailParagraph(purpose.intro),
    emailCode(params.code, `This code expires in ${params.expiryMinutes} minutes and works only once.`),
    ACCESS_CODES.has(params.type)
      ? emailNote('If you did not ask for this, ignore this email and consider changing your password. Never share this code with anyone.', 'warning')
      : emailNote('Viralkar will never ask you for this code by phone, chat or email. Do not share it with anyone.'),
    emailSmallPrint('If you did not ask for this code, you can safely ignore this email.'),
  ].join('');

  return { subject: `${params.code} is your Viralkar code`, html, preheader: `${purpose.heading}: ${params.code}` };
}
