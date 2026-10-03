import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TOKEN_CONFIG } from '../constants';
import type { AccessTokenResult, RefreshTokenValidation } from '../interfaces';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

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
        // Unique per token, so two sessions created in the same second never share a token (or its hash).
        jwtid: crypto.randomUUID(),
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

  async validateRefreshToken(refreshToken: string): Promise<RefreshTokenValidation | null> {
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
    const session = await this.sessionRepository.findLatestByRefreshTokenHash(hash);

    if (!session) return null;
    if (session.status === 'REVOKED') {
      await this.handleRevokedTokenUse(session.userId, session.id, session.revokedAt);
      return null;
    }
    if (session.status !== 'ACTIVE') return null;
    if (session.expiresAt < new Date()) {
      await this.sessionRepository.revoke(session.id);
      return null;
    }

    return {
      userId: session.userId,
      sessionId: session.id,
      deviceId: session.deviceId ?? undefined,
      rememberMe: this.wasRememberMe(session.createdAt, session.expiresAt),
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
  }

  /**
   * Revokes a session as part of refresh-token rotation. Only one of two simultaneous refreshes with the same
   * token may win: otherwise both would get a fresh token and the account would have two live chains.
   */
  async revokeForRotation(sessionId: string): Promise<boolean> {
    return this.sessionRepository.revokeIfActive(sessionId);
  }

  /**
   * A refresh token is single use. Seeing one again after its session was rotated or revoked means a copy exists
   * somewhere else (a stolen token used first, or used after the owner signed out), and there is no way to tell
   * which holder is the owner, so every session of the account is ended. Inside the grace window it is treated as
   * two tabs racing to refresh and simply refused.
   */
  private async handleRevokedTokenUse(userId: string, sessionId: string, revokedAt: Date | null): Promise<void> {
    const graceMs = TOKEN_CONFIG.REFRESH_REUSE_GRACE_SECONDS * 1000;
    if (revokedAt && Date.now() - revokedAt.getTime() <= graceMs) return;

    this.logger.warn(`Refresh token reuse on revoked session ${sessionId}; revoking all sessions of user ${userId}`);
    await this.sessionRepository.revokeAllByUserId(userId);
  }

  /** "Remember me" is not stored, but its sessions are the ones that live longer than the default. */
  private wasRememberMe(createdAt: Date, expiresAt: Date): boolean {
    const defaultExpiry = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const defaultMs = this.parseExpiryToSeconds(defaultExpiry) * 1000;
    return expiresAt.getTime() - createdAt.getTime() > defaultMs + 60_000;
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