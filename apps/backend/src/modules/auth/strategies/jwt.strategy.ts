import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { BLOCKED_ACCOUNT_STATUSES } from '../constants';
import type { TokenPayload } from '../interfaces';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
      issuer: configService.get<string>('jwt.issuer', 'viral-kar'),
      audience: configService.get<string>('jwt.audience', 'viral-kar-users'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: TokenPayload) {
    // Use simple lookup — no RBAC join needed on every authenticated request.
    // Roles are embedded in the JWT payload at token issuance time.
    const user = await this.userRepository.findByIdSimple(payload.sub);
    if (!user) {
      this.logger.warn(`Token validation failed: User ${payload.sub} not found`);
      throw new UnauthorizedException('User not found');
    }
    if (BLOCKED_ACCOUNT_STATUSES.includes(user.status as (typeof BLOCKED_ACCOUNT_STATUSES)[number])) {
      this.logger.warn(`Token validation failed: User ${user.id} account is ${user.status}`);
      throw new UnauthorizedException('Account is not active');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: payload.role ?? [],   // payload.role is string[] — map to roles array
      sessionId: payload.sessionId,
    };
  }
}
