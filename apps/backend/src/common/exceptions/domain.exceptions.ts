import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '../constants';

import { AppException } from './app.exception';

export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string | number) {
    super({
      code: ERROR_CODES.NOT_FOUND,
      message: identifier
        ? `${resource} with identifier '${identifier}' was not found.`
        : `${resource} was not found.`,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized. Please authenticate.') {
    super({
      code: ERROR_CODES.UNAUTHORIZED,
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'You do not have permission to perform this action.') {
    super({
      code: ERROR_CODES.FORBIDDEN,
      message,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ConflictException extends AppException {
  constructor(resource: string, field?: string) {
    super({
      code: ERROR_CODES.CONFLICT,
      message: field
        ? `${resource} with this ${field} already exists.`
        : `${resource} already exists.`,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ValidationException extends AppException {
  constructor(details: Record<string, unknown>) {
    super({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed. Please check the provided data.',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class BadRequestException extends AppException {
  constructor(message: string, code = ERROR_CODES.BAD_REQUEST) {
    super({
      code,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InsufficientBalanceException extends AppException {
  constructor() {
    super({
      code: ERROR_CODES.INSUFFICIENT_BALANCE,
      message: 'Insufficient wallet balance to complete this operation.',
      statusCode: HttpStatus.PAYMENT_REQUIRED,
    });
  }
}

export class ServiceUnavailableException extends AppException {
  constructor(service: string) {
    super({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: `The ${service} service is temporarily unavailable. Please try again later.`,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

/**
 * Generic fallback for unexpected/programmer-error conditions (e.g. invalid
 * internal arguments) that don't map to a more specific domain exception.
 * The Global Exception Filter ensures the client never sees internals such
 * as stack traces — only the message/code below are exposed.
 */
export class InternalServerException extends AppException {
  constructor(message = 'An unexpected error occurred. Please try again later.') {
    super({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
