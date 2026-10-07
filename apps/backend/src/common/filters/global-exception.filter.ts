import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ERROR_CODES } from '../constants';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { describeError } from '../utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolveException(exception);
    const { statusCode, code, details } = resolved;
    // The rate limiter's own text ("ThrottlerException: Too Many Requests") is not something to show a person.
    const message =
      statusCode === HttpStatus.TOO_MANY_REQUESTS ? rateLimitMessage(response.getHeader('Retry-After')) : resolved.message;

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode,
      code,
      message,
      details,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      // Real Errors get their full stack; anything else (a plain object thrown
      // by a third-party SDK, e.g. Razorpay) gets a readable description instead
      // of the useless "[object Object]" String(exception) used to produce.
      const detail = exception instanceof Error ? exception.stack : describeError(exception);
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode} ${code}: ${message}`,
        detail,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${statusCode} ${code}: ${message}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        return {
          statusCode: status,
          code: (res['code'] as string) ?? this.statusToCode(status),
          message: (res['message'] as string) ?? exception.message,
          details: res['details'] as Record<string, unknown> | undefined,
        };
      }

      return {
        statusCode: status,
        code: this.statusToCode(status),
        message: String(exceptionResponse),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: ERROR_CODES.BAD_REQUEST,
      401: ERROR_CODES.UNAUTHORIZED,
      403: ERROR_CODES.FORBIDDEN,
      404: ERROR_CODES.NOT_FOUND,
      409: ERROR_CODES.CONFLICT,
      422: ERROR_CODES.VALIDATION_ERROR,
      429: ERROR_CODES.TOO_MANY_REQUESTS,
      500: ERROR_CODES.INTERNAL_SERVER_ERROR,
      503: ERROR_CODES.SERVICE_UNAVAILABLE,
    };
    return map[status] ?? ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
}

/**
 * What a person reads when they have tried something too often, with how long to wait when the limiter said
 * (it sets Retry-After, in seconds, just before refusing).
 */
export function rateLimitMessage(retryAfter: unknown): string {
  const seconds = Number(Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Too many attempts. Please wait a little and try again.';
  }
  if (seconds < 60) {
    return `Too many attempts. Please try again in ${Math.ceil(seconds)} second${Math.ceil(seconds) === 1 ? '' : 's'}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
