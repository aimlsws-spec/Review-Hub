import { REFERRAL_CONSTANTS } from '../../src/modules/referral/constants';
import { WALLET_CONSTANTS } from '../../src/modules/wallet/constants';

/**
 * The help content the support chatbot answers from (it reads active FAQs and published CMS pages, see
 * KnowledgeBaseService). Everything here describes what the platform really does today, so when a rule changes the
 * matching answer has to change with it. Amounts come from the same constants the rules use, never typed twice.
 *
 * Seeding only adds what is missing. An admin who edits an answer in the portal keeps their edit.
 */
export interface SeedFaq {
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  /** Earlier wording of this answer that was wrong. It is replaced only while it is still exactly this text. */
  replacesAnswers?: string[];
}

export interface SeedCmsPage {
  slug: string;
  title: string;
  metaDescription: string;
  content: string;
}

const MIN_WITHDRAWAL = WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT;
const MAX_BANK_ACCOUNTS = WALLET_CONSTANTS.MAX_BANK_ACCOUNTS;
const REFERRAL_BONUS = REFERRAL_CONSTANTS.SIGNUP_BONUS_AMOUNT;

const HONEST = 'Your reward never depends on the rating you give or on whether your review is good or bad.';

export const HELP_FAQS: SeedFaq[] = [
  // ── Getting started ───────────────────────────────────────
  {
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'Download the app and sign up with your mobile number or email.',
    sortOrder: 1,
  },
  {
    category: 'Getting Started',
    question: 'Is ReviewHub free to use?',
    answer: 'Yes, ReviewHub is completely free for users.',
    sortOrder: 2,
  },

  // ── Reviews and honest feedback ───────────────────────────
  {
    category: 'Reviews & Honest Feedback',
    question: 'Do I have to give 5 stars, a good rating or a positive review to get my reward?',
    answer: `No. ${HONEST} Write what you really think, good or bad. We check that you did the task, not what your opinion is.`,
    sortOrder: 1,
  },
  {
    category: 'Reviews & Honest Feedback',
    question: 'Can I write a bad, negative or mixed review and still get my reward?',
    answer:
      'Yes. Honest reviews are welcome, including ones that say what could be better. A negative or mixed review earns the same reward as a positive one, as long as you did the task and sent the proof it asks for.',
    sortOrder: 2,
  },
  {
    category: 'Reviews & Honest Feedback',
    question: 'A business asked me for 5 stars or a positive review. What should I do?',
    answer:
      'You do not have to. Campaigns that ask for a particular star rating, or that pay for one, are not allowed on the platform. Give the rating you honestly think is right and still submit the task as normal. You can also tell us through Support so we can look at the campaign.',
    sortOrder: 3,
  },
  {
    category: 'Reviews & Honest Feedback',
    question: 'Can the app write my review for me?',
    answer:
      'The "Help me write" option on a review task can suggest a few drafts. You tell it how your visit went overall, what was good and what could be better, and it writes options only from your answers. It never adds praise you did not give or says you recommend the place unless you said so. Change anything you like. Nothing is posted for you: you post the review yourself.',
    sortOrder: 4,
  },
  {
    category: 'Reviews & Honest Feedback',
    question: 'What do I need to do for a review task to count?',
    answer:
      'Visit or use the business, write your own review where the task tells you to, and send the proof the task asks for, such as a screenshot, a link or a written answer. Read the task instructions before you start.',
    sortOrder: 5,
  },

  // ── Campaigns and submissions ─────────────────────────────
  {
    category: 'Campaigns',
    question: 'How do I join a campaign?',
    answer: 'Browse available campaigns and tap "Join" to participate.',
    sortOrder: 1,
  },
  {
    category: 'Campaigns',
    question: 'How long does campaign approval take?',
    answer: 'Campaigns are typically reviewed within 24-48 hours.',
    sortOrder: 2,
  },
  {
    category: 'Campaigns',
    question: 'What happens after I submit my proof?',
    answer:
      'Your submission is checked automatically. Clear cases are approved quickly. If it needs a closer look, our team reviews it by hand. You can follow its status any time under My Submissions.',
    sortOrder: 3,
  },
  {
    category: 'Rejected Submissions',
    question: 'Why was my submission rejected?',
    answer:
      'The reason is shown on the submission under My Submissions. The usual causes are proof that is missing, unreadable or does not match the task, or proof that was already used for another submission. A submission is never rejected because of your rating or because your review is negative.',
    sortOrder: 1,
  },
  {
    category: 'Rejected Submissions',
    question: 'Can I submit again or try again after my submission is rejected?',
    answer:
      'Yes. A rejected task can be submitted again with new or clearer proof. A task that is still being checked, or is already approved, cannot be submitted again.',
    sortOrder: 2,
  },

  // ── Rewards, wallet and withdrawals ───────────────────────
  {
    category: 'Payments',
    question: 'When do I get my reward?',
    answer:
      'As soon as your submission is approved, the reward is added to your wallet balance automatically. If your submission is still pending, the reward comes after it is approved.',
    sortOrder: 1,
  },
  {
    category: 'Payments',
    question: 'Where can I see my earnings and wallet history?',
    answer: 'Open Wallet and then Transactions. Every reward, withdrawal and hold is listed there.',
    sortOrder: 2,
  },
  {
    category: 'Payments',
    question: 'How do I withdraw my earnings?',
    answer: `Go to Wallet > Withdraw and choose a bank account. Before your first withdrawal your PAN must be verified, and you can save up to ${MAX_BANK_ACCOUNTS} bank accounts.`,
    sortOrder: 3,
    replacesAnswers: ['Go to Wallet > Withdraw and add your bank account details.'],
  },
  {
    category: 'Payments',
    question: 'What is the minimum withdrawal amount?',
    answer: `The minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`,
    sortOrder: 4,
    replacesAnswers: ['The minimum withdrawal amount is ₹100.'],
  },
  {
    category: 'Payments',
    question: 'Why can I not withdraw my money?',
    answer: `The usual reasons are: your PAN is not verified yet, the amount is below ₹${MIN_WITHDRAWAL}, the amount is more than your available balance, or the bank account was not accepted. The message on the withdraw screen tells you which one it is.`,
    sortOrder: 5,
  },
  {
    category: 'Payments',
    question: 'Why is my withdrawal under review?',
    answer:
      'Some withdrawals are checked by our team before they are approved, to keep accounts safe. You do not need to do anything. The amount stays set aside from your balance while it is checked, and you can follow the status in your withdrawal history.',
    sortOrder: 6,
  },
  {
    category: 'Payments',
    question: 'What happens to my money if a withdrawal is rejected?',
    answer:
      'The amount goes back to your available balance. The reason for the rejection is shown in your withdrawal history, and you can request again once it is sorted out.',
    sortOrder: 7,
  },

  // ── KYC ───────────────────────────────────────────────────
  {
    category: 'KYC',
    question: 'Why is PAN needed before I can withdraw?',
    answer: 'PAN verification is required before you can withdraw money. It is a one-time step and you only need to do it once.',
    sortOrder: 1,
  },
  {
    category: 'KYC',
    question: 'How do I verify my PAN? Where do I upload it?',
    answer:
      'Open KYC settings in your profile and upload your PAN as a photo or PDF (JPEG, PNG, WebP or PDF, up to 10 MB). Our team reviews it, and you can see the result there.',
    sortOrder: 2,
  },
  {
    category: 'KYC',
    question: 'My KYC document was not accepted. What now?',
    answer:
      'Upload it again with a clear, well-lit photo where all four corners and every detail are readable. Check that the document is yours and not expired.',
    sortOrder: 3,
  },

  // ── Referrals and account ─────────────────────────────────
  {
    category: 'Referrals',
    question: 'How does the referral bonus work?',
    answer: `Share your referral code with a friend. When your friend signs up with it and gets their first task reward credited, you receive a one-time bonus of ₹${REFERRAL_BONUS}.`,
    sortOrder: 1,
  },
  {
    category: 'Account & Security',
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login screen tap "Forgot password" and follow the steps. A code is sent to you to set a new password.',
    sortOrder: 1,
  },
  {
    category: 'Account & Security',
    question: 'Can I use more than one account?',
    answer:
      'Each person should use one account. Using several accounts, or sharing proof between accounts, can lead to submissions being rejected and withdrawals being held for review.',
    sortOrder: 2,
  },
];

export const HELP_PAGES: SeedCmsPage[] = [
  {
    slug: 'honest-feedback',
    title: 'Honest feedback and your rewards',
    metaDescription: 'How reviews and rewards work: you are paid for doing the task, never for a particular rating.',
    content: [
      '<h2>Honest feedback comes first</h2>',
      `<p>${HONEST} You are rewarded for doing the task and sending the proof it asks for. Your opinion is yours.</p>`,
      '<h2>What is allowed</h2>',
      '<p>Positive, mixed and negative reviews are all welcome. Say what was good and say what could be better. A review that points out a problem is as valuable to the business and to other customers as one that praises it.</p>',
      '<h2>What is not allowed</h2>',
      '<p>Campaigns may not ask for a particular star rating, ask you to write only positive things, ask for fake or repeated reviews, or promise a reward for a rating. Campaign wording is checked before it goes live, and you can report a campaign that breaks this through Support.</p>',
      '<h2>Getting help writing your review</h2>',
      '<p>On a review task you can tap "Help me write". You answer a few questions about your visit and it suggests drafts from your answers alone. It does not add praise you did not give, and it does not say you recommend the place unless you told it so. You edit the draft and post the review yourself.</p>',
      '<h2>How your submission is checked</h2>',
      '<p>We check that the task was done and that the proof is genuine and readable. We do not judge whether your review is positive or negative. If a submission is rejected, the reason is shown under My Submissions and you can try again with better proof.</p>',
      '<h2>Getting paid</h2>',
      `<p>Approved rewards are added to your wallet. To withdraw, your PAN must be verified and the amount must be at least ₹${MIN_WITHDRAWAL}. Some withdrawals are checked by our team first to keep accounts safe.</p>`,
    ].join('\n'),
  },
];
