import {
  emailButton,
  emailDetails,
  emailHeading,
  emailNote,
  emailParagraph,
  emailSmallPrint,
  emailSteps,
} from '../../../mail/templates';

/** A built email: what goes in the subject, the body, and the inbox preview line. */
export interface MerchantEmail {
  subject: string;
  html: string;
  preheader: string;
}

/** Every value is plain text; the email blocks escape it, so a business name can never inject markup. */
export function buildMerchantRegisteredEmail(businessName: string): MerchantEmail {
  return {
    subject: `${businessName} is registered on Viralkar`,
    preheader: 'One more step: verify your business to start running campaigns.',
    html: [
      emailHeading('Your business is registered'),
      emailParagraph(`Thank you for registering ${businessName} on Viralkar, where real customers share honest reviews, posts and stories about your business.`),
      emailParagraph('To start running campaigns, finish these steps in the merchant portal:'),
      emailSteps([
        'Upload your business documents (PAN, GST or business registration) under Documents.',
        'Wait for our team to verify them. We usually review within one working day.',
        'Add funds to your wallet and launch your first campaign.',
      ]),
      emailSmallPrint('We will email you as soon as your business is verified.'),
    ].join(''),
  };
}

export function buildMerchantApprovedEmail(businessName: string): MerchantEmail {
  return {
    subject: `${businessName} is verified — you can now run campaigns`,
    preheader: 'Your business is approved on Viralkar.',
    html: [
      emailHeading('Your business is verified 🎉'),
      emailParagraph(`Good news: ${businessName} has been approved on Viralkar.`),
      emailParagraph('You can now add funds to your wallet and launch campaigns that reward customers for honest feedback about your business.'),
      emailNote('Tip: campaigns with a clear task and a fair reward get the most genuine responses.'),
    ].join(''),
  };
}

export function buildMerchantRejectedEmail(businessName: string, reason: string): MerchantEmail {
  return {
    subject: `Action needed: verification of ${businessName}`,
    preheader: 'We could not verify your business yet.',
    html: [
      emailHeading('We could not verify your business yet'),
      emailParagraph(`Our team reviewed ${businessName} but could not complete its verification.`),
      emailDetails([['Reason', reason]]),
      emailParagraph('Please correct this in the merchant portal and submit your documents again. We will review them as soon as they arrive.'),
      emailSmallPrint('Questions? Reply through Support in the merchant portal.'),
    ].join(''),
  };
}

export function buildTeamInviteEmail(role: string, inviteUrl: string): MerchantEmail {
  return {
    subject: 'You are invited to a merchant team on Viralkar',
    preheader: `Join as ${role}.`,
    html: [
      emailHeading('You are invited to join a merchant team'),
      emailParagraph(`You have been invited to help manage a business on Viralkar, with the role ${role}.`),
      emailButton('Accept invitation', inviteUrl),
      emailSmallPrint('If you were not expecting this invitation, you can ignore this email.'),
    ].join(''),
  };
}
