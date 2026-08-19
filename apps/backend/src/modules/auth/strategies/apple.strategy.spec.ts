import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { AppleStrategy } from './apple.strategy';

describe('AppleStrategy', () => {
  let strategy: AppleStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('config-value'),
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new AppleStrategy(
      mockConfigService as unknown as ConfigService,
      mockJwtService as unknown as JwtService,
    );
  });

  describe('validate', () => {
    it('decodes the id_token and reads the name Apple posts on first authorization', (done) => {
      mockJwtService.decode.mockReturnValue({ sub: 'apple-sub-1', email: 'john@example.com' });
      const req = { body: { user: JSON.stringify({ name: { firstName: 'John', lastName: 'Doe' } }) } } as unknown as Request;

      strategy.validate(req, 'access', 'refresh', 'raw-id-token', {}, (err, user) => {
        expect(err).toBeNull();
        expect(user).toEqual({
          providerId: 'apple-sub-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        });
        done();
      });
    });

    it('falls back to placeholder names on a repeat sign-in with no user field', (done) => {
      mockJwtService.decode.mockReturnValue({ sub: 'apple-sub-1', email: 'john@example.com' });
      const req = { body: {} } as unknown as Request;

      strategy.validate(req, 'access', 'refresh', 'raw-id-token', {}, (err, user) => {
        expect(err).toBeNull();
        expect(user).toMatchObject({ providerId: 'apple-sub-1', firstName: 'Apple', lastName: 'User' });
        done();
      });
    });

    it('falls back to placeholder names when the user field is malformed JSON', (done) => {
      mockJwtService.decode.mockReturnValue({ sub: 'apple-sub-1' });
      const req = { body: { user: '{not-json' } } as unknown as Request;

      strategy.validate(req, 'access', 'refresh', 'raw-id-token', {}, (err, user) => {
        expect(err).toBeNull();
        expect(user).toMatchObject({ providerId: 'apple-sub-1', firstName: 'Apple', lastName: 'User' });
        done();
      });
    });

    it('errors when the id_token has no sub claim', (done) => {
      mockJwtService.decode.mockReturnValue(null);
      const req = { body: {} } as unknown as Request;

      strategy.validate(req, 'access', 'refresh', 'raw-id-token', {}, (err, user) => {
        expect(err).toBeInstanceOf(Error);
        expect(user).toBeUndefined();
        done();
      });
    });
  });
});
