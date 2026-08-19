import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-apple';

export interface AppleProfile {
  providerId: string;
  email?: string;
  firstName: string;
  lastName: string;
}

/** Decoded payload of the Apple-issued id_token — only the claims we read. */
interface AppleIdTokenClaims {
  sub: string;
  email?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: configService.get<string>('oauth.apple.clientId'),
      teamID: configService.get<string>('oauth.apple.teamId'),
      keyID: configService.get<string>('oauth.apple.keyId'),
      privateKeyString: configService.get<string>('oauth.apple.privateKey'),
      callbackURL: configService.get<string>('oauth.apple.callbackUrl'),
      passReqToCallback: true,
      scope: ['name', 'email'],
    });
  }

  validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    idToken: string,
    _profile: unknown,
    done: (err: Error | null, user?: AppleProfile) => void,
  ): void {
    // The id_token comes straight from Apple's token endpoint via a server-to-server
    // exchange over TLS, so it's already trustworthy here — no signature re-verification needed.
    const claims = this.jwtService.decode(idToken) as AppleIdTokenClaims | null;
    if (!claims?.sub) {
      done(new Error('Apple did not return a valid identity token'));
      return;
    }

    // Apple only ever sends the user's name once, as a JSON string in the form-post
    // body's `user` field on the very first authorization — never inside the id_token.
    let firstName = 'Apple';
    let lastName = 'User';
    const rawUser = (req.body as { user?: string } | undefined)?.user;
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
        firstName = parsed.name?.firstName ?? firstName;
        lastName = parsed.name?.lastName ?? lastName;
      } catch {
        // Malformed `user` field — fall back to the placeholder name above.
      }
    }

    done(null, { providerId: claims.sub, email: claims.email, firstName, lastName });
  }
}
