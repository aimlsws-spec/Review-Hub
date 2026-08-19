import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-google-oauth20';

import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('config-value'),
  };

  beforeEach(() => {
    strategy = new GoogleStrategy(mockConfigService as unknown as ConfigService);
  });

  describe('validate', () => {
    it('maps a full Google profile to a GoogleProfile', (done) => {
      const profile = {
        id: 'google-sub-1',
        emails: [{ value: 'john@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'https://example.com/avatar.jpg' }],
      } as unknown as Profile;

      strategy.validate('access', 'refresh', profile, (err, user) => {
        expect(err).toBeNull();
        expect(user).toEqual({
          providerId: 'google-sub-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        });
        done();
      });
    });

    it('falls back to displayName and placeholder fields when the profile is sparse', (done) => {
      const profile = {
        id: 'google-sub-2',
        displayName: 'Just A Name',
      } as unknown as Profile;

      strategy.validate('access', 'refresh', profile, (err, user) => {
        expect(err).toBeNull();
        expect(user).toMatchObject({
          providerId: 'google-sub-2',
          email: undefined,
          firstName: 'Just A Name',
          lastName: 'User',
          avatarUrl: undefined,
        });
        done();
      });
    });
  });
});
