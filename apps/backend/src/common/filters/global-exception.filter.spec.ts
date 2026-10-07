import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import { GlobalExceptionFilter, rateLimitMessage } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  /** Runs the filter on an exception and returns the JSON body sent, with the response's Retry-After header set. */
  function send(exception: unknown, retryAfter?: string): Record<string, unknown> {
    let body: Record<string, unknown> = {};
    const response = {
      getHeader: (name: string) => (name === 'Retry-After' ? retryAfter : undefined),
      status: () => ({ json: (sent: Record<string, unknown>) => (body = sent) }),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: '/api/v1/auth/forgot-password', method: 'POST' }) }),
    } as unknown as ArgumentsHost;
    new GlobalExceptionFilter().catch(exception, host);
    return body;
  }

  it('never shows the rate limiter\'s own wording, and says how long to wait', () => {
    const body = send(new ThrottlerException(), '540');

    expect(body.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(body.code).toBe('TOO_MANY_REQUESTS');
    expect(body.message).toBe('Too many attempts. Please try again in 9 minutes.');
    expect(String(body.message)).not.toMatch(/Throttler/);
  });

  it('keeps every other error message as it is', () => {
    expect(send(new HttpException('Not allowed', HttpStatus.FORBIDDEN)).message).toBe('Not allowed');
  });
});

describe('rateLimitMessage', () => {
  it.each([
    ['30', 'Too many attempts. Please try again in 30 seconds.'],
    ['1', 'Too many attempts. Please try again in 1 second.'],
    ['60', 'Too many attempts. Please try again in 1 minute.'],
    ['61', 'Too many attempts. Please try again in 2 minutes.'],
    [undefined, 'Too many attempts. Please wait a little and try again.'],
    ['nonsense', 'Too many attempts. Please wait a little and try again.'],
  ])('Retry-After %s → %s', (retryAfter, message) => {
    expect(rateLimitMessage(retryAfter)).toBe(message);
  });
});
