import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

import { ERROR_CODES } from '../../common/constants';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message } = this.resolve(exception);

    this.logger.error(`Prisma error on ${request.method} ${request.url}: ${message}`);

    response.status(statusCode).json({
      success: false,
      statusCode,
      code,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError): {
    statusCode: number;
    code: string;
    message: string;
  } {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid data provided to the database.',
      };
    }

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ERROR_CODES.CONFLICT,
          message: `A record with this ${String((exception.meta?.['target'] as string[])?.join(', ') ?? 'field')} already exists.`,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
          message: 'The requested record was not found.',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Foreign key constraint failed.',
        };
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERROR_CODES.BAD_REQUEST,
          message: 'The change would violate a required relation.',
        };
      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERROR_CODES.BAD_REQUEST,
          message: `The value provided is too long for field: ${String(exception.meta?.['column_name'] ?? 'unknown')}.`,
        };
      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ERROR_CODES.BAD_REQUEST,
          message: `A required field is missing: ${String(exception.meta?.['constraint'] ?? 'unknown')}.`,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred.',
        };
    }
  }
}
