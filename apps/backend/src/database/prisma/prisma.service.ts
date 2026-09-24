import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { InternalServerException } from '@common/exceptions/domain.exceptions';

/**
 * Applies DATABASE_POOL_MAX / DATABASE_CONNECTION_TIMEOUT (database.config.ts) to the connection
 * Prisma actually opens, via the URL query params its MySQL connector reads them from.
 *
 * Bug fixed 23 Sep 2026 (found by a load test): these two env vars were parsed into config and
 * documented in .env.example as real tuning knobs, but nothing ever applied them — Prisma fell
 * back to its own default pool size (`num_physical_cpus * 2 + 1`) regardless of what an operator
 * set DATABASE_POOL_MAX to. Under concurrent load exceeding that default, requests needing a
 * connection queued past Prisma's default 2-second pool wait and interactive transactions failed
 * with "Transaction not found... obtained before disconnecting" instead of a clean queue/retry.
 * A production deployment expecting to raise the pool for higher concurrency was silently getting
 * the same small default no matter what it set.
 *
 * DATABASE_POOL_MIN has no Prisma equivalent — Prisma's pool has no minimum/pre-warm concept, it
 * opens connections lazily up to the limit as load demands them — so it stays parsed (for anyone
 * reading config) but deliberately unused here rather than silently pretended to do something.
 */
export function connectionUrlWithPoolSettings(baseUrl: string | undefined, poolMax: number, connectionTimeoutMs: number): string | undefined {
  if (!baseUrl) return baseUrl;
  const url = new URL(baseUrl);
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', String(poolMax));
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', String(Math.ceil(connectionTimeoutMs / 1000)));
  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: connectionUrlWithPoolSettings(
            process.env.DATABASE_URL,
            parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
            parseInt(process.env.DATABASE_CONNECTION_TIMEOUT ?? '30000', 10),
          ),
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      (this as unknown as { $on: (event: string, cb: (e: { query: string; duration: number }) => void) => void })
        .$on('query', (e) => {
          if (e.duration > 200) {
            this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
          }
        });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run multiple operations in a single transaction.
   * Usage: await prisma.transaction(async (tx) => { ... })
   */
  async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    return this.$transaction(fn, options);
  }

  /**
   * Soft-delete a record by setting deletedAt to now.
   */
  async softDelete(
    model: string,
    where: Record<string, unknown>,
  ): Promise<void> {
    const delegate = (this as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[model];
    if (!delegate) throw new InternalServerException(`Model "${model}" not found on PrismaService`);
    await delegate.update({ where, data: { deletedAt: new Date() } });
  }

  /**
   * Build a standard soft-delete where clause.
   */
  withoutDeleted<T extends Record<string, unknown>>(where?: T): T & { deletedAt: null } {
    return { ...(where ?? {}), deletedAt: null } as T & { deletedAt: null };
  }
}
