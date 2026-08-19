import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { InternalServerException } from '@common/exceptions/domain.exceptions';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
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
