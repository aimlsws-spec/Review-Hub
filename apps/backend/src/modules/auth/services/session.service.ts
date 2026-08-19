import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AccessTokenResult } from '../interfaces';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceId?: string,
    rememberMe = false,
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const defaultExpiry = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const refreshExpiresIn = rememberMe ? '30d' : defaultExpiry;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { 
        secret: refreshSecret, 
        expiresIn: refreshExpiresIn,
        issuer: this.configService.get<string>('jwt.issuer', 'viral-kar'),
        audience: this.configService.get<string>('jwt.audience', 'viral-kar-users'),
        algorithm: 'HS256',
      },
    );

    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshExpirySeconds = this.parseExpiryToSeconds(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);

    const session = await this.sessionRepository.create({
      user: { connect: { id: userId } },
      refreshTokenHash,
      ipAddress,
      userAgent,
      device: deviceId ? { connect: { id: deviceId } } : undefined,
      expiresAt,
    });

    return { sessionId: session.id, refreshToken };
  }

  async validateRefreshToken(refreshToken: string): Promise<{ userId: string; sessionId: string } | null> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    // Verify JWT signature and expiry first — reject tampered/expired tokens immediately
    let payload: { sub: string; type: string } | null = null;
    try {
      payload = this.jwtService.verify<{ sub: string; type: string }>(refreshToken, { 
        secret: refreshSecret,
        issuer: this.configService.get<string>('jwt.issuer', 'viral-kar'),
        audience: this.configService.get<string>('jwt.audience', 'viral-kar-users'),
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }

    if (payload.type !== 'refresh') return null;

    // Verify the token exists in DB and is not revoked
    const hash = this.hashToken(refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.sessionRepository.revoke(session.id);
      return null;
    }

    return { userId: session.userId, sessionId: session.id };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
  }

  async revokeAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId, excludeSessionId);
  }

  generateTokens(userId: string, sessionId: string, roles: string[] = []): AccessTokenResult {
    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');

    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access', role: roles, sessionId },
      { secret: accessSecret, expiresIn: accessExpiresIn },
    );

    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return { accessToken, expiresIn };
  }

  async getActiveSessions(userId: string) {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  async getSessionById(sessionId: string) {
    return this.sessionRepository.findById(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.revokeExpiredSessions();
    return result.count;
  }

  async deleteOldSessions(): Promise<number> {
    const result = await this.sessionRepository.deleteExpiredSessions();
    return result.count;
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (map[unit] ?? 1);
  }
}