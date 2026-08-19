import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UnauthorizedException } from '@common/exceptions/domain.exceptions';

import type { TokenPayload } from '../interfaces';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      issuer: configService.get<string>('jwt.issuer', 'viral-kar'),
      audience: configService.get<string>('jwt.audience', 'viral-kar-users'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: TokenPayload) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { sub: payload.sub, sessionId: payload.sessionId };
  }
}
