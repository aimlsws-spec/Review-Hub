import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  providerId: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      // passport-oauth2 throws at construction time if clientID is falsy, which would crash
      // the whole app on boot whenever Google OAuth isn't configured (e.g. local dev) — fall
      // back to a placeholder so the strategy registers but simply fails auth attempts instead.
      clientID: configService.get<string>('oauth.google.clientId') || 'google-oauth-not-configured',
      clientSecret: configService.get<string>('oauth.google.clientSecret'),
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void {
    const googleProfile: GoogleProfile = {
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName ?? profile.displayName ?? 'Google',
      lastName: profile.name?.familyName ?? 'User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, googleProfile);
  }
}
