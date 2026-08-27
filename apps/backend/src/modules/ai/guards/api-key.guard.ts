import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

import { UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

/**
 * Guards the internal AI-service endpoints. These sit behind `@Public()`
 * (bypassing the global JWT guard, same pattern as the Razorpay webhook)
 * because the caller is another backend service (apps/ai-services), not a
 * logged-in user — it authenticates with a key/secret pair from the
 * `ApiKey` table instead of a JWT.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-api-key'];
    const secret = request.headers['x-api-secret'];

    if (typeof key !== 'string' || typeof secret !== 'string') {
      throw new UnauthorizedException('Missing API credentials');
    }

    const apiKey = await this.prisma.apiKey.findUnique({ where: { key } });
    if (!apiKey || !apiKey.active || apiKey.deletedAt) {
      throw new UnauthorizedException('Invalid API credentials');
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    const valid = await bcrypt.compare(secret, apiKey.secret);
    if (!valid) {
      this.logger.warn(`Rejected API key auth attempt for key "${apiKey.name}"`);
      throw new UnauthorizedException('Invalid API credentials');
    }

    // Best-effort — a failed timestamp update shouldn't fail the request itself.
    this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);

    return true;
  }
}
