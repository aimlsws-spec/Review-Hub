import { registerAs } from '@nestjs/config';

export const smtpConfig = registerAs('smtp', () => ({
  // 'json' builds each message and throws it away: nothing leaves the machine. Used by the e2e tests.
  transport: process.env.MAIL_TRANSPORT === 'json' ? 'json' : 'smtp',
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  fromName: process.env.SMTP_FROM_NAME ?? 'ReviewHub',
  fromEmail: process.env.SMTP_FROM_EMAIL ?? 'noreply@reviewhub.com',
}));
