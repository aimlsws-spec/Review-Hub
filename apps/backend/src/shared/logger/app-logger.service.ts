import { Inject, Injectable, LoggerService, Optional, Scope } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;

  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger?: LoggerService,
  ) {}

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, context?: string): void {
    this.logger?.log(message, context ?? this.context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger?.error(message, trace, context ?? this.context);
  }

  warn(message: string, context?: string): void {
    this.logger?.warn(message, context ?? this.context);
  }

  debug(message: string, context?: string): void {
    this.logger?.debug?.(message, context ?? this.context);
  }

  verbose(message: string, context?: string): void {
    this.logger?.verbose?.(message, context ?? this.context);
  }
}
