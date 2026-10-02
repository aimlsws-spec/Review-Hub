import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Firebase error codes meaning the token is permanently gone, not a temporary delivery problem. */
const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

/**
 * Thin wrapper around Firebase Admin's messaging API. Mirrors MailService's
 * graceful-degradation pattern: without Firebase credentials configured, push
 * is simply disabled rather than crashing the app — same as SMTP/Twilio.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('firebase.projectId');
    const privateKey = this.config.get<string>('firebase.privateKey');
    const clientEmail = this.config.get<string>('firebase.clientEmail');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn('Firebase credentials not configured — push notifications disabled.');
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
      });
      this.logger.log('Firebase Admin initialized — push notifications enabled');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error instanceof Error ? error.message : String(error));
    }
  }

  get isEnabled(): boolean {
    return this.app !== null;
  }

  /**
   * Never throws — a push delivery failure must never break notification dispatch. Returns the tokens Firebase says
   * will never work again (app uninstalled, token replaced), so the caller can stop storing them.
   */
  async sendToTokens(tokens: string[], message: PushMessage): Promise<string[]> {
    if (!this.app || tokens.length === 0) return [];

    try {
      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title: message.title, body: message.body },
        data: message.data,
      });
      if (response.failureCount > 0) {
        this.logger.warn(`${response.failureCount}/${tokens.length} push notifications failed to deliver`);
      }
      return response.responses.flatMap((result, index) =>
        !result.success && DEAD_TOKEN_CODES.has(result.error?.code ?? '') ? [tokens[index]] : [],
      );
    } catch (error) {
      this.logger.error('Failed to send push notification', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}
