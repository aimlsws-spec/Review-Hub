import {
  emailDetails,
  emailHeading,
  emailNote,
  emailParagraph,
  emailSmallPrint,
  emailSteps,
} from '../../../mail/templates';

/** A built email: what goes in the subject, the body, and the inbox preview line. */
export interface BuiltEmail {
  subject: string;
  html: string;
  preheader: string;
}

const hello = (firstName?: string | null) => (firstName ? `Hi ${firstName},` : 'Hi,');

/** Sent once the email address is verified (or straight away for a Google sign-up, which arrives verified). */
export function buildWelcomeEmail(firstName?: string | null): BuiltEmail {
  return {
    subject: 'Welcome to Viralkar 🎉',
    preheader: 'Your account is ready. Here is how to start earning.',
    html: [
      emailHeading('Welcome to Viralkar!'),
      emailParagraph(hello(firstName)),
      emailParagraph(
        'Your email is verified and your account is ready. Viralkar rewards you for sharing honest experiences of the ' +
          'places and brands you visit. Here is how to get started:',
      ),
      emailSteps([
        'Complete identity verification: upload your PAN card or an identity document in Profile → KYC / Verification. It unlocks tasks, rewards and your wallet.',
        'Browse campaigns near you and complete tasks: reviews, posts and stories.',
        'Add your bank account in Wallet, so you can withdraw what you earn.',
      ]),
      emailNote('Honest feedback only: rewards are paid for genuine experiences, never for fake or copied reviews.'),
      emailSmallPrint('Happy earning! — The Viralkar team'),
    ].join(''),
  };
}

export function buildPasswordChangedEmail(firstName: string | null, at: Date): BuiltEmail {
  return {
    subject: 'Your Viralkar password was changed',
    preheader: 'If this was not you, act now.',
    html: [
      emailHeading('Your password was changed'),
      emailParagraph(hello(firstName)),
      emailParagraph('The password for your Viralkar account was just changed, and you were signed out on your other devices.'),
      emailDetails([['When', formatWhen(at)]]),
      emailNote('If you did not change it, reset your password straight away from the sign-in screen ("Forgot password") and contact support from the app.', 'warning'),
    ].join(''),
  };
}

export function buildNewSignInEmail(params: {
  firstName: string | null;
  device: string;
  ipAddress: string;
  at: Date;
}): BuiltEmail {
  return {
    subject: 'New sign-in to your Viralkar account',
    preheader: `Signed in from ${params.device}.`,
    html: [
      emailHeading('New sign-in to your account'),
      emailParagraph(hello(params.firstName)),
      emailParagraph('Your Viralkar account was just signed in to from a device it had not used before.'),
      emailDetails([
        ['Device', params.device],
        ['IP address', params.ipAddress],
        ['When', formatWhen(params.at)],
      ]),
      emailParagraph('If this was you, there is nothing to do.'),
      emailNote('If this was not you, change your password now and sign out of all devices from Settings in the app.', 'warning'),
    ].join(''),
  };
}

export function buildAccountDeletedEmail(): BuiltEmail {
  return {
    subject: 'Your Viralkar account has been deleted',
    preheader: 'We are sorry to see you go.',
    html: [
      emailHeading('Your account has been deleted'),
      emailParagraph('Your Viralkar account has been deleted, as you asked. You have been signed out everywhere.'),
      emailParagraph('This email address and your phone number are free again, so you can create a new account with them at any time.'),
      emailNote('If you did not ask for this, contact Viralkar support immediately.', 'warning'),
      emailSmallPrint('Thank you for being part of Viralkar.'),
    ].join(''),
  };
}

export function buildPhoneChangedEmail(maskedNewPhone: string): BuiltEmail {
  return {
    subject: 'Your Viralkar phone number was changed',
    preheader: `The number on your account is now ${maskedNewPhone}.`,
    html: [
      emailHeading('Your phone number was changed'),
      emailParagraph(`The phone number on your Viralkar account was changed to ${maskedNewPhone}.`),
      emailNote('If you did not do this, contact Viralkar support immediately.', 'warning'),
    ].join(''),
  };
}

/** India time, which is where Viralkar's people are, with the zone written out so it is never ambiguous. */
function formatWhen(at: Date): string {
  return `${at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`;
}
