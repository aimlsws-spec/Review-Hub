import { registerAs } from '@nestjs/config';

export const twilioConfig = registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
  authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
  // WhatsApp reuses the SMS account — Twilio's WhatsApp sender is a separate
  // number you enable in the Twilio console, not a separate account.
  whatsappFromNumber: process.env.TWILIO_WHATSAPP_FROM_NUMBER ?? '',
}));
