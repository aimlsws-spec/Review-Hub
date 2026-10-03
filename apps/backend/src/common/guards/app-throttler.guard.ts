import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface TrackedRequest {
  user?: { id?: string };
  ip?: string;
}

/**
 * Rate limits per signed-in account, and per IP address only before sign-in.
 *
 * Why not per IP throughout: Indian mobile carriers put many subscribers behind one public address (CGNAT), so a
 * per-IP limit on signed-in routes would throttle unrelated people together. Runs after JwtAuthGuard (registration
 * order in app.module.ts), so `req.user` is already set when there is a valid token.
 *
 * The IP is `req.ip`, never the raw X-Forwarded-For list: with TRUST_PROXY set, Express already picks the client
 * address the trusted proxy saw, while the leftmost X-Forwarded-For entry is whatever the client typed, and trusting
 * it would let anyone dodge every limit by sending a new fake address each time.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: TrackedRequest): Promise<string> {
    if (req.user?.id) return `user:${req.user.id}`;
    return `ip:${req.ip ?? 'unknown'}`;
  }
}
