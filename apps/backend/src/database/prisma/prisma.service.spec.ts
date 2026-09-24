import { connectionUrlWithPoolSettings } from './prisma.service';

/**
 * Regression test for a bug found by a load test (23 Sep 2026): DATABASE_POOL_MAX and
 * DATABASE_CONNECTION_TIMEOUT were parsed into config but never actually applied to the Prisma
 * connection, so Prisma silently used its own default pool size no matter what an operator set.
 */
describe('connectionUrlWithPoolSettings', () => {
  it('adds connection_limit and pool_timeout (converted from ms to seconds) to the URL', () => {
    const result = connectionUrlWithPoolSettings('mysql://user:pass@localhost:3306/db', 25, 30000);

    const url = new URL(result as string);
    expect(url.searchParams.get('connection_limit')).toBe('25');
    expect(url.searchParams.get('pool_timeout')).toBe('30');
  });

  it('rounds a sub-second timeout up rather than truncating it to 0', () => {
    const result = connectionUrlWithPoolSettings('mysql://user:pass@localhost:3306/db', 10, 500);
    expect(new URL(result as string).searchParams.get('pool_timeout')).toBe('1');
  });

  it('does not override a connection_limit or pool_timeout already present on the URL', () => {
    const result = connectionUrlWithPoolSettings('mysql://user:pass@localhost:3306/db?connection_limit=99&pool_timeout=5', 10, 30000);

    const url = new URL(result as string);
    expect(url.searchParams.get('connection_limit')).toBe('99');
    expect(url.searchParams.get('pool_timeout')).toBe('5');
  });

  it('preserves the rest of the connection string, including existing query params', () => {
    const result = connectionUrlWithPoolSettings('mysql://user:pass@localhost:3306/db?ssl=true', 10, 30000);

    // mysql: is a non-special WHATWG scheme, so host/port/path/userinfo are read individually
    // rather than via .origin (which is "null" for any scheme that isn't http/https/ws/wss/ftp/file).
    const url = new URL(result as string);
    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe('3306');
    expect(url.pathname).toBe('/db');
    expect(url.username).toBe('user');
    expect(url.password).toBe('pass');
    expect(url.searchParams.get('ssl')).toBe('true');
  });

  it('returns undefined unchanged when no URL is configured', () => {
    expect(connectionUrlWithPoolSettings(undefined, 10, 30000)).toBeUndefined();
  });
});
