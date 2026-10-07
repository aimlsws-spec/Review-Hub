import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

import { htmlToPlainText, renderEmailLayout } from './templates';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  /** The preview line inbox lists show after the subject. */
  preheader?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter =
      config.get<string>('smtp.transport') === 'json'
        ? nodemailer.createTransport({ jsonTransport: true })
        : nodemailer.createTransport({
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

  /**
   * Sends one email. A body that is not already a full HTML document is wrapped in the Viralkar layout, so every
   * message carries the same branding without each sender repeating it; a plain-text version is added for mail apps
   * that do not show HTML.
   */
  async send(options: SendMailOptions): Promise<void> {
    const from = `"${this.config.get<string>('smtp.fromName', 'Viralkar')}" <${this.config.get<string>('smtp.fromEmail')}>`;
    const { preheader, html, text, ...rest } = options;
    const isFullDocument = /<html[\s>]/i.test(html);

    try {
      await this.transporter.sendMail({
        from,
        ...rest,
        html: isFullDocument ? html : renderEmailLayout(html, preheader),
        text: text ?? htmlToPlainText(html),
      });
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
