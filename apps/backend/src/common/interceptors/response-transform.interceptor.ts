import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiSuccessResponse } from '../interfaces/api-response.interface';

export const SKIP_RESPONSE_TRANSFORM = 'skipResponseTransform';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_TRANSFORM, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle() as Observable<ApiSuccessResponse<T>>;
    }

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: response.statusCode,
        message: this.resolveMessage(request.method, data),
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }

  private resolveMessage(method: string, data: unknown): string {
    if (data === null || data === undefined) {
      return 'Operation completed successfully.';
    }
    const methodMessages: Record<string, string> = {
      GET: 'Data retrieved successfully.',
      POST: 'Resource created successfully.',
      PUT: 'Resource updated successfully.',
      PATCH: 'Resource updated successfully.',
      DELETE: 'Resource deleted successfully.',
    };
    return methodMessages[method] ?? 'Operation completed successfully.';
  }
}
