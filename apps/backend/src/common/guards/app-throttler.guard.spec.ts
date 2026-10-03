import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';

import { AppThrottlerGuard } from './app-throttler.guard';

/** Exposes the protected tracker so it can be tested directly. */
class TestableGuard extends AppThrottlerGuard {
  tracker(req: { user?: { id?: string }; ip?: string; ips?: string[] }) {
    return this.getTracker(req);
  }
}

describe('AppThrottlerGuard', () => {
  const guard = new TestableGuard({} as ThrottlerModuleOptions, {} as ThrottlerStorage, new Reflector());

  it('limits a signed-in caller by account, so people sharing a carrier IP are not limited together', async () => {
    await expect(guard.tracker({ user: { id: 'user-123' }, ip: '203.0.113.7' })).resolves.toBe('user:user-123');
  });

  it('limits an anonymous caller by the address Express resolved', async () => {
    await expect(guard.tracker({ ip: '203.0.113.7' })).resolves.toBe('ip:203.0.113.7');
  });

  // Regression: an earlier version used req.ips[0], the leftmost X-Forwarded-For entry, which the client controls.
  it('ignores the client-supplied X-Forwarded-For list, which anyone can fake', async () => {
    await expect(guard.tracker({ ip: '203.0.113.7', ips: ['1.2.3.4', '203.0.113.7'] })).resolves.toBe('ip:203.0.113.7');
  });
});
