import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * Wraps Twilio for SMS and WhatsApp delivery. Mirrors MailService's
 * graceful-degradation pattern: without TWILIO_* credentials configured,
 * `send()`/`sendWhatsapp()` log a warning and resolve without throwing —
 * an OTP/alert that can't be delivered by SMS must never break the request
 * that triggered it (email is always sent in parallel where one exists).
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const accountSid = this.config.get<string>('twilio.accountSid');
    const authToken = this.config.get<string>('twilio.authToken');

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials not configured — SMS/WhatsApp delivery disabled.');
      return;
    }

    this.client = new Twilio(accountSid, authToken);
    this.logger.log('Twilio client initialized — SMS/WhatsApp delivery enabled');
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async send(to: string, body: string): Promise<void> {
    const fromNumber = this.config.get<string>('twilio.fromNumber');
    if (!this.client || !fromNumber) {
      this.logger.warn(`SMS to ${to} skipped — Twilio not configured`);
      return;
    }

    try {
      await this.client.messages.create({ to, from: fromNumber, body });
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}`, error instanceof Error ? error.message : String(error));
    }
  }

  async sendWhatsapp(to: string, body: string): Promise<void> {
    const whatsappFrom = this.config.get<string>('twilio.whatsappFromNumber');
    if (!this.client || !whatsappFrom) {
      this.logger.warn(`WhatsApp message to ${to} skipped — Twilio WhatsApp sender not configured`);
      return;
    }

    try {
      await this.client.messages.create({ to: `whatsapp:${to}`, from: `whatsapp:${whatsappFrom}`, body });
      this.logger.log(`WhatsApp message sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}`, error instanceof Error ? error.message : String(error));
    }
  }
}
