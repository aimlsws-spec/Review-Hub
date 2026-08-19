import { Logger } from '@nestjs/common';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  protected logInfo(message: string, context?: Record<string, unknown>): void {
    this.logger.log(context ? `${message} ${JSON.stringify(context)}` : message);
  }

  protected logError(message: string, error?: unknown): void {
    this.logger.error(message, error instanceof Error ? error.stack : String(error ?? ''));
  }

  protected logWarn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ? `${message} ${JSON.stringify(context)}` : message);
  }
}
