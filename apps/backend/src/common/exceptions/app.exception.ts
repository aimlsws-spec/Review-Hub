import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionOptions {
  code: string;
  message: string;
  statusCode?: HttpStatus;
  details?: Record<string, unknown>;
  cause?: Error;
}

export class AppException extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppExceptionOptions) {
    const statusCode = options.statusCode ?? HttpStatus.BAD_REQUEST;

    super(
      {
        code: options.code,
        message: options.message,
        details: options.details,
      },
      statusCode,
      { cause: options.cause },
    );

    this.code = options.code;
    this.details = options.details;
  }
}
