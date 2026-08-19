import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

export const ApiAuthRequired = () =>
  applyDecorators(
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );

export const ApiPaginatedResponse = (description: string) =>
  applyDecorators(
    ApiResponse({ status: 200, description }),
  );
