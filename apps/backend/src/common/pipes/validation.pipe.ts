import { ValidationPipe, ValidationError, UnprocessableEntityException } from '@nestjs/common';

import { ERROR_CODES } from '../constants';

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors: ValidationError[]) => {
      const details = formatValidationErrors(errors);
      return new UnprocessableEntityException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed. Please check the provided data.',
        details,
      });
    },
  });
}

function formatValidationErrors(
  errors: ValidationError[],
  parentField = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const field = parentField ? `${parentField}.${error.property}` : error.property;

    if (error.constraints) {
      result[field] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      const nested = formatValidationErrors(error.children, field);
      Object.assign(result, nested);
    }
  }

  return result;
}
