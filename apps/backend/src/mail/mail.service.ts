import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('smtp.host'),
      port: config.get<number>('smtp.port', 587),
      secure: config.get<boolean>('smtp.secure', false),
      auth: {
        user: config.get<string>('smtp.user'),
        pass: config.get<string>('smtp.pass'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    const ok = await this.verifyConnection();
    if (!ok) {
      this.logger.warn('SMTP connection could not be verified — emails may fail. Check SMTP configuration.');
    } else {
      this.logger.log('SMTP connection verified');
    }
  }

  async send(options: SendMailOptions): Promise<void> {
    const from = `"${this.config.get<string>('smtp.fromName', 'ReviewHub')}" <${this.config.get<string>('smtp.fromEmail')}>`;

    try {
      await this.transporter.sendMail({ from, ...options });
      this.logger.log(`Email sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    } catch (error) {
      this.logger.error('Failed to send email', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async sendTemplate(
    to: string,
    subject: string,
    template: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const html = this.interpolate(template, variables);
    await this.send({ to, subject, html });
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
