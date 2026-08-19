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
      clientID: configService.get<string>('oauth.google.clientId'),
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
